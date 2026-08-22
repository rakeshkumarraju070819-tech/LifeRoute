import { readFile } from 'node:fs/promises';
import { pool } from './db.mjs';

try {
  await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  console.log('PostgreSQL schema initialized.');
} finally {
  await pool.end();
}