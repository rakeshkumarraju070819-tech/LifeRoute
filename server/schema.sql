CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS emergencies (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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