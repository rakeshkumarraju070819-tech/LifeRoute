import cors from 'cors';
import express from 'express';
import { checkDatabase, pool } from './db.mjs';
import { config } from './config.mjs';
import { getTomTomApiKey, proxyTomTom, proxyTomTomPost, setTomTomApiKey } from './tomtom.mjs';
import { recommendHospital } from './ai.mjs';
import { explainWithGroq } from './aiExplain.mjs';
import { authenticate, login, register, requireRole } from './auth.mjs';
import { getSharedState, isSyncableKey, setSharedState } from './sync.mjs';
import { broadcastStateUpdate } from './realtime.mjs';

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '10kb' }));

app.post('/api/auth/signup', async (request, response, next) => {
  try {
    const data = request.body || {};
    if (!data.name || !data.email || !data.password || !data.phone || !data.role || !data.organization) {
      return response.status(400).json({ error: 'Name, email, phone, password, role, and organization are required.' });
    }
    if (data.password.length < 8) return response.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (!['AMBULANCE_CREW', 'DISPATCHER', 'HOSPITAL_STAFF'].includes(data.role)) return response.status(400).json({ error: 'Invalid role.' });
    const user = await register(data);
    response.status(201).json({ user, message: 'Account created and awaiting verification.' });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'An account with this email already exists.' });
    next(error);
  }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const { email, password } = request.body || {};
    if (!email || !password) return response.status(400).json({ error: 'Email and password are required.' });
    response.json(await login(email, password));
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', authenticate, (request, response) => response.json({ user: request.user }));

app.patch('/api/auth/profile', authenticate, async (request, response, next) => {
  try {
    const { name, phone } = request.body || {};
    if (!name?.trim() || !phone?.trim()) return response.status(400).json({ error: 'Name and phone are required.' });
    const { rows } = await pool.query(`UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING ${'id, name, email, phone, role, organization, employee_id AS "employeeId", department, ambulance_id AS "ambulanceId", dispatch_center AS "dispatchCenter", status'}`, [name.trim(), phone.trim(), request.user.id]);
    response.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/hospital/capacity', authenticate, requireRole('HOSPITAL_STAFF'), async (request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT operational_status AS "operationalStatus", departments, updated_at AS "updatedAt" FROM hospital_capacity WHERE hospital_id = $1', [request.user.id]);
    if (!rows[0]) return response.status(404).json({ error: 'Hospital capacity record not found.' });
    response.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/hospital/capacity', authenticate, requireRole('HOSPITAL_STAFF'), async (request, response, next) => {
  try {
    const { operationalStatus, departments } = request.body || {};
    const allowedStatuses = ['OPEN', 'LIMITED', 'FULL', 'EMERGENCY ONLY', 'CLOSED'];
    if (!allowedStatuses.includes(operationalStatus) || !departments || typeof departments !== 'object') return response.status(400).json({ error: 'Valid operational status and departments are required.' });
    const { rows } = await pool.query(
      'UPDATE hospital_capacity SET operational_status = $1, departments = $2, updated_at = NOW() WHERE hospital_id = $3 RETURNING operational_status AS "operationalStatus", departments, updated_at AS "updatedAt"',
      [operationalStatus, JSON.stringify(departments), request.user.id],
    );
    if (!rows[0]) return response.status(404).json({ error: 'Hospital capacity record not found.' });
    response.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (_request, response) => {
  try {
    await checkDatabase();
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    response.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

app.get('/api/tomtom/config', (_request, response) => {
  const apiKey = getTomTomApiKey();
  response.json({ configured: Boolean(apiKey), apiKey: apiKey || undefined });
});

app.post('/api/tomtom/config', (request, response) => {
  const { apiKey } = request.body || {};
  if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return response.status(400).json({ error: 'A valid TomTom API key is required.' });
  }
  setTomTomApiKey(apiKey);
  response.json({ configured: true });
});

app.get('/api/tomtom/search', async (request, response, next) => {
  try {
    const query = typeof request.query.query === 'string' ? request.query.query.trim() : '';
    if (!query) return response.status(400).json({ error: 'Search query is required.' });
    const result = await proxyTomTom(`/search/2/search/${encodeURIComponent(query)}.json`, request.query);
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tomtom/route', async (request, response, next) => {
  try {
    const locations = typeof request.query.locations === 'string' ? request.query.locations.trim() : '';
    if (!locations) return response.status(400).json({ error: 'Route locations are required.' });
    const { locations: _locations, ...routeQuery } = request.query;
    const result = await proxyTomTom(`/routing/1/calculateRoute/${encodeURIComponent(locations)}/json`, routeQuery);
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

// Traffic Flow Segment Data: current speed/travel-time vs free-flow for the
// road segment nearest `point`, so the dashboard can show live congestion
// and drive traffic-aware rerouting (tech-stack doc section 4D).
app.get('/api/tomtom/traffic', async (request, response, next) => {
  try {
    const point = typeof request.query.point === 'string' ? request.query.point.trim() : '';
    if (!point) return response.status(400).json({ error: 'A "point" query parameter (lat,lon) is required.' });
    const zoom = typeof request.query.zoom === 'string' ? request.query.zoom.trim() : '10';
    const { point: _point, zoom: _zoom, ...trafficQuery } = request.query;
    const result = await proxyTomTom(`/traffic/services/4/flowSegmentData/absolute/${encodeURIComponent(zoom)}/json`, { ...trafficQuery, point });
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

// Reverse Geocoding: convert a lat/lon (e.g. a pin dropped on the map, or an
// ambulance's GPS fix) into a human-readable address for the incident form.
app.get('/api/tomtom/reverse-geocode', async (request, response, next) => {
  try {
    const latitude = typeof request.query.lat === 'string' ? request.query.lat.trim() : '';
    const longitude = typeof request.query.lon === 'string' ? request.query.lon.trim() : '';
    if (!latitude || !longitude) return response.status(400).json({ error: 'lat and lon query parameters are required.' });
    const { lat: _lat, lon: _lon, ...geoQuery } = request.query;
    const result = await proxyTomTom(`/search/2/reverseGeocode/${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}.json`, geoQuery);
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

// Matrix Routing: batch travel-time/distance from one or more origins (e.g.
// the incident location) to several destinations (candidate hospitals), so
// the dashboard can compare ETAs across hospitals instead of only the single
// recommended one (tech-stack doc section 21).
app.post('/api/tomtom/matrix', async (request, response, next) => {
  try {
    const { origins, destinations } = request.body || {};
    if (!Array.isArray(origins) || !origins.length || !Array.isArray(destinations) || !destinations.length) {
      return response.status(400).json({ error: 'origins and destinations arrays are required.' });
    }
    const toPoint = ([latitude, longitude]) => ({ point: { latitude, longitude } });
    const result = await proxyTomTomPost('/routing/matrix/2/matrix/sync', {
      origins: origins.map(toPoint),
      destinations: destinations.map(toPoint),
    });
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/recommend-hospital', async (request, response, next) => {
  try {
    const recommendation = recommendHospital(request.body);

    // Optional: ask Groq to review the rules-based pick against the same
    // vetted candidate list and either confirm it or override with a
    // different candidate + plain-English reasoning. Any failure (no key,
    // timeout, bad response) leaves `recommendation` exactly as the
    // deterministic scorer produced it — this call can only add an
    // `ai` block, never remove or invalidate the rules-based result.
    const aiReview = await explainWithGroq(recommendation);
    if (aiReview) {
      response.json({
        ...recommendation,
        ...(aiReview.overridden
          ? { hospitalId: aiReview.hospitalId, hospitalName: aiReview.hospitalName, distanceKm: aiReview.distanceKm, etaMinutes: aiReview.etaMinutes, decidedBy: 'ai' }
          : {}),
        ai: aiReview,
      });
      return;
    }

    response.json(recommendation);
  } catch (error) {
    next(error);
  }
});

app.get('/api/emergencies', authenticate, async (request, response, next) => {
  try {
    const filter = request.user.role === 'DISPATCHER' ? '' : request.user.role === 'AMBULANCE_CREW' ? 'WHERE ambulance_id = $1' : 'WHERE status IN (\'ASSIGNED\', \'AMBULANCE EN ROUTE\', \'PATIENT PICKED UP\', \'EN ROUTE TO HOSPITAL\')';
    const values = request.user.role === 'AMBULANCE_CREW' ? [request.user.ambulanceId] : [];
    const { rows } = await pool.query(`SELECT id, type, severity, location, status, ambulance_id AS "ambulanceId", notes, created_at AS "createdAt" FROM emergencies ${filter} ORDER BY created_at DESC LIMIT 100`, values);
    response.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/emergencies', authenticate, requireRole('DISPATCHER'), async (request, response, next) => {
  try {
    const { type, severity, location, ambulanceId, notes, latitude, longitude } = request.body || {};
    if (!type || !severity || !location) return response.status(400).json({ error: 'Type, severity, and pickup location are required.' });
    const id = `EM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
    const { rows } = await pool.query(
      `INSERT INTO emergencies (id, type, severity, location, status, ambulance_id, notes, geo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ${hasCoords ? 'ST_SetSRID(ST_MakePoint($9, $8), 4326)::geography' : 'NULL'})
       RETURNING id, type, severity, location, status, ambulance_id AS "ambulanceId", notes, created_at AS "createdAt"`,
      hasCoords
        ? [id, type, severity, location.trim(), ambulanceId ? 'ASSIGNED' : 'NEW', ambulanceId || null, notes || null, latitude, longitude]
        : [id, type, severity, location.trim(), ambulanceId ? 'ASSIGNED' : 'NEW', ambulanceId || null, notes || null],
    );
    response.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// PostGIS-backed nearest-hospitals lookup: given a lat/lng (e.g. the
// incident's pickup location), returns hospitals within radiusKm ordered by
// real geographic distance, using the `hospitals` table's GEOGRAPHY column
// and GIST index (previously this queried `emergencies`, which returned
// nearby incidents rather than hospitals). Complements the JS haversine
// scoring in ai.mjs with a DB-level spatial query, per the tech-stack doc's
// PostGIS recommendation.
app.get('/api/hospitals/nearby', authenticate, async (request, response, next) => {
  try {
    const latitude = Number(request.query.lat);
    const longitude = Number(request.query.lng);
    const radiusKm = Number(request.query.radiusKm) || 25;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return response.status(400).json({ error: 'lat and lng query parameters are required.' });
    }
    const { rows } = await pool.query(
      `SELECT id, name,
              ROUND((ST_Distance(geo, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000)::numeric, 2) AS "distanceKm"
       FROM hospitals
       WHERE ST_DWithin(geo, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3 * 1000)
       ORDER BY geo <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       LIMIT 25`,
      [latitude, longitude, radiusKm],
    );
    response.json(rows);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/emergencies/:id/status', authenticate, requireRole('DISPATCHER', 'AMBULANCE_CREW'), async (request, response, next) => {
  try {
    const { status } = request.body || {};
    const allowed = ['AVAILABLE', 'DISPATCHED', 'EN ROUTE TO PATIENT', 'PATIENT PICKED UP', 'EN ROUTE TO HOSPITAL', 'ARRIVED', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) return response.status(400).json({ error: 'Invalid emergency status.' });
    const ownership = request.user.role === 'AMBULANCE_CREW' ? 'AND ambulance_id = $3' : '';
    const values = request.user.role === 'AMBULANCE_CREW' ? [status, request.params.id, request.user.ambulanceId] : [status, request.params.id];
    const { rows } = await pool.query(`UPDATE emergencies SET status = $1 WHERE id = $2 ${ownership} RETURNING id, status`, values);
    if (!rows[0]) return response.status(404).json({ error: 'Emergency not found or not assigned to this ambulance.' });
    response.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// --- Shared live-state sync (emergencies, ambulances, hospitals, notifications) ---
// Reads/writes a JSONB snapshot per collection and broadcasts every write over
// Socket.IO, so all connected dashboards (dispatcher/crew/hospital) update
// live instead of only syncing across browser tabs via localStorage.
app.get('/api/sync/:key', authenticate, async (request, response, next) => {
  try {
    const { key } = request.params;
    if (!isSyncableKey(key)) return response.status(404).json({ error: 'Unknown sync key.' });
    response.json(await getSharedState(key));
  } catch (error) {
    next(error);
  }
});

app.put('/api/sync/:key', authenticate, async (request, response, next) => {
  try {
    const { key } = request.params;
    if (!isSyncableKey(key)) return response.status(404).json({ error: 'Unknown sync key.' });
    const { value, socketId } = request.body || {};
    if (!Array.isArray(value)) return response.status(400).json({ error: 'value must be an array.' });
    const snapshot = await setSharedState(key, value);
    broadcastStateUpdate(key, snapshot, socketId);
    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const statusCode = error.statusCode || 500;
  console.error('API request failed:', error.message);
  response.status(statusCode).json({ error: statusCode === 500 ? 'Internal server error.' : error.message });
});

export default app;