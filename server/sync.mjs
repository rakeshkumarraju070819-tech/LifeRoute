import { pool } from './db.mjs';

// Keys allowed to sync. Mirrors STORAGE_KEYS in src/data/constants.ts —
// keep in sync if new collections are added on the frontend.
const ALLOWED_KEYS = new Set([
  'emergency_intelligence_emergencies',
  'emergency_intelligence_ambulances',
  'emergency_intelligence_hospitals',
  'emergency_intelligence_notifications',
]);

// In-memory fallback so the demo still works if the Postgres connection is
// unavailable (same pattern used for DEMO_USERS in auth.mjs).
const memoryStore = new Map();

export function isSyncableKey(key) {
  return ALLOWED_KEYS.has(key);
}

export async function getSharedState(key) {
  try {
    const { rows } = await pool.query('SELECT value, updated_at AS "updatedAt" FROM shared_state WHERE key = $1', [key]);
    if (rows[0]) return rows[0];
  } catch (error) {
    console.error(`shared_state read failed for ${key}, falling back to memory:`, error.message);
  }
  return memoryStore.get(key) || { value: [], updatedAt: null };
}

export async function setSharedState(key, value) {
  const snapshot = { value, updatedAt: new Date().toISOString() };
  try {
    await pool.query(
      `INSERT INTO shared_state (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(value)],
    );
  } catch (error) {
    console.error(`shared_state write failed for ${key}, falling back to memory:`, error.message);
    memoryStore.set(key, snapshot);
  }
  return snapshot;
}
