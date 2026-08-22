import cors from 'cors';
import express from 'express';
import { checkDatabase, pool } from './db.mjs';
import { config } from './config.mjs';
import { getTomTomApiKey, proxyTomTom, setTomTomApiKey } from './tomtom.mjs';
import { recommendHospital } from './ai.mjs';
import { authenticate, login, register } from './auth.mjs';

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
    const result = await proxyTomTom('/search/2/search', request.query);
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tomtom/route', async (request, response, next) => {
  try {
    const result = await proxyTomTom('/routing/1/calculateRoute', request.query);
    response.status(result.status).type(result.contentType).send(result.payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/recommend-hospital', (request, response, next) => {
  try {
    response.json(recommendHospital(request.body));
  } catch (error) {
    next(error);
  }
});

app.get('/api/emergencies', async (_request, response, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, type, severity, location, status, created_at FROM emergencies ORDER BY created_at DESC LIMIT 100',
    );
    response.json(rows);
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