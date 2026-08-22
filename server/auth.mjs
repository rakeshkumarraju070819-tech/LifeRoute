import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.mjs';
import { pool } from './db.mjs';

const USER_COLUMNS = 'id, name, email, phone, role, organization, employee_id AS "employeeId", department, ambulance_id AS "ambulanceId", dispatch_center AS "dispatchCenter", status';

const DEMO_USERS = {
  'crew@demo.com': {
    id: '00000000-0000-0000-0000-000000000001', name: 'Marcus Reid', email: 'crew@demo.com', phone: '+1 555-0101',
    role: 'AMBULANCE_CREW', organization: 'Metro Ambulance Service', employeeId: 'EMP-2847', ambulanceId: 'AMB-042', status: 'active',
    passwordHash: '$2b$12$fP9TgfPQo/CyDf2K80LLc.ODxL0AWfDpqz2od2yehnFasGlrMNaZq',
  },
  'dispatch@demo.com': {
    id: '00000000-0000-0000-0000-000000000002', name: 'Sarah Chen', email: 'dispatch@demo.com', phone: '+1 555-0202',
    role: 'DISPATCHER', organization: 'Central Dispatch Authority', employeeId: 'DSP-1193', dispatchCenter: 'Central-1', status: 'active',
    passwordHash: '$2b$12$fP9TgfPQo/CyDf2K80LLc.ODxL0AWfDpqz2od2yehnFasGlrMNaZq',
  },
  'hospital@demo.com': {
    id: '00000000-0000-0000-0000-000000000003', name: 'Dr. James Okafor', email: 'hospital@demo.com', phone: '+1 555-0303',
    role: 'HOSPITAL_STAFF', organization: 'City General Hospital', employeeId: 'HSP-5512', department: 'Emergency Medicine', status: 'active',
    passwordHash: '$2b$12$fP9TgfPQo/CyDf2K80LLc.ODxL0AWfDpqz2od2yehnFasGlrMNaZq',
  },
};

export function publicUser(user) {
  return user;
}

export function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, demo: user.demo === true }, config.jwtSecret, { expiresIn: '8h' });
}

export async function authenticate(request, response, next) {
  try {
    const header = request.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required.' });
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    let user;
    try {
      const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [payload.sub]);
      user = rows[0];
    } catch (error) {
      if (payload.demo) user = DEMO_USERS[payload.email];
      else throw error;
    }
    if (!user || user.status !== 'active') return response.status(401).json({ error: 'Session expired. Please sign in again.' });
    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

export async function login(email, password) {
  let rows;
  try {
    ({ rows } = await pool.query(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = LOWER($1)`, [email]));
  } catch (error) {
    const demoUser = DEMO_USERS[email.toLowerCase()];
    if (!demoUser || !(await bcrypt.compare(password, demoUser.passwordHash))) throw error;
    const { passwordHash: _passwordHash, ...user } = demoUser;
    user.demo = true;
    return { user, token: createToken(user) };
  }
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

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) return response.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };
}