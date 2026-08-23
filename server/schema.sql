CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS emergencies (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  ambulance_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS ambulance_id TEXT;
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS emergencies_created_at_idx ON emergencies (created_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('AMBULANCE_CREW', 'DISPATCHER', 'HOSPITAL_STAFF')),
  organization TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  department TEXT,
  ambulance_id TEXT,
  dispatch_center TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email, phone, password_hash, role, organization, employee_id, ambulance_id, status)
VALUES
  ('Marcus Reid', 'crew@demo.com', '+1 555-0101', '$2b$12$fP9TgfPQo/CyDf2K80LLc.ODxL0AWfDpqz2od2yehnFasGlrMNaZq', 'AMBULANCE_CREW', 'Metro Ambulance Service', 'EMP-2847', 'AMB-042', 'active'),
  ('Sarah Chen', 'dispatch@demo.com', '+1 555-0202', '$2b$12$fP9TgfPQo/CyDf2K80LLc.ODxL0AWfDpqz2od2yehnFasGlrMNaZq', 'DISPATCHER', 'Central Dispatch Authority', 'DSP-1193', NULL, 'active'),
  ('Dr. James Okafor', 'hospital@demo.com', '+1 555-0303', '$2b$12$fP9TgfPQo/CyDf2K80LLc.ODxL0AWfDpqz2od2yehnFasGlrMNaZq', 'HOSPITAL_STAFF', 'City General Hospital', 'HSP-5512', NULL, 'active')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS hospital_capacity (
  hospital_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  operational_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (operational_status IN ('OPEN', 'LIMITED', 'FULL', 'EMERGENCY ONLY', 'CLOSED')),
  departments JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO hospital_capacity (hospital_id, departments)
SELECT id, '{"General Beds":{"avail":45,"total":80,"status":"AVAILABLE"},"ICU Beds":{"avail":8,"total":20,"status":"AVAILABLE"},"Emergency Dept":{"avail":6,"total":12,"status":"AVAILABLE"},"Trauma Unit":{"avail":2,"total":4,"status":"LIMITED"},"Cardiac Unit":{"avail":3,"total":6,"status":"AVAILABLE"}}'::jsonb
FROM users WHERE email = 'hospital@demo.com'
ON CONFLICT (hospital_id) DO NOTHING;

-- Hospital locations for PostGIS-backed "nearby hospitals" queries. This is
-- separate from hospital_capacity (which tracks bed counts for the single
-- logged-in demo hospital user) — this table holds a point-in-space for
-- every hospital shown on the map, seeded to match src/data/seedData.ts, so
-- GET /api/hospitals/nearby can do a real geographic distance query instead
-- of only comparing hospitals in JS.
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  geo GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS hospitals_geo_idx ON hospitals USING GIST (geo);

INSERT INTO hospitals (id, name, geo) VALUES
  ('HOSP-001', 'City General Hospital', ST_SetSRID(ST_MakePoint(-73.9950, 40.7300), 4326)::geography),
  ('HOSP-002', 'St. Mary''s Medical Center', ST_SetSRID(ST_MakePoint(-73.9800, 40.7400), 4326)::geography),
  ('HOSP-003', 'Riverside Trauma Center', ST_SetSRID(ST_MakePoint(-73.9700, 40.7500), 4326)::geography)
ON CONFLICT (id) DO NOTHING;

-- Shared live-state sync: stores the four dashboard collections (emergencies,
-- ambulances, hospitals, notifications) as JSONB snapshots so every connected
-- client (dispatcher / crew / hospital, on any device) reads the same state
-- instead of relying on browser localStorage. Socket.IO broadcasts pushes on
-- every write (see server/sync.mjs) so the dashboard updates without a
-- refresh, matching the "Real-Time Event Flow" in the tech-stack doc.
CREATE TABLE IF NOT EXISTS shared_state (
  key TEXT PRIMARY KEY,          -- one of STORAGE_KEYS on the frontend
  value JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geospatial columns for emergencies, so "nearest hospital" / distance
-- queries can be done in PostGIS instead of only in JS (server/ai.mjs still
-- works unchanged; these columns are additive).
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS geo GEOGRAPHY(POINT, 4326);
CREATE INDEX IF NOT EXISTS emergencies_geo_idx ON emergencies USING GIST (geo);