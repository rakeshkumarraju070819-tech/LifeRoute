import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.mjs';
import { pool } from './db.mjs';

const USER_COLUMNS = 'id, name, email, phone, role, organization, employee_id AS "employeeId", department, ambulance_id AS "ambulanceId", dispatch_center AS "dispatchCenter", status';

export function publicUser(user) {
  return user;
}

export function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h' });
}

export async function authenticate(request, response, next) {
  try {
    const header = request.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required.' });
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [payload.sub]);
    if (!rows[0] || rows[0].status !== 'active') return response.status(401).json({ error: 'Session expired. Please sign in again.' });
    request.user = rows[0];
    next();
  } catch {
    response.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

export async function login(email, password) {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error('Incorrect email or password.');
    error.statusCode = 401;
    throw error;
  }
  if (user.status === 'pending') {
    const error = new Error('Your account is awaiting verification.');
    error.statusCode = 403;
    throw error;
  }
  if (user.status === 'disabled') {
    const error = new Error('This account has been disabled. Contact support.');
    error.statusCode = 403;
    throw error;
  }
  delete user.password_hash;
  return { user, token: createToken(user) };
}

export async function register(data) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, organization, employee_id, department, ambulance_id, dispatch_center)
     VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${USER_COLUMNS}`,
    [data.name.trim(), data.email, data.phone.trim(), passwordHash, data.role, data.organization.trim(), data.employeeId || 'PENDING', data.department || null, data.ambulanceId || null, data.dispatchCenter || null],
  );
  return rows[0];
}