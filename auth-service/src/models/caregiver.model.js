const { pool } = require('../config/database');

const findByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM caregivers WHERE email = $1 AND is_active = true',
    [email]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, phone, role, is_active, created_at, updated_at
     FROM caregivers WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

const create = async ({ name, email, password, phone = null, role = 'caregiver' }) => {
  const { rows } = await pool.query(
    `INSERT INTO caregivers (name, email, password, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, role, is_active, created_at`,
    [name, email, password, phone, role]
  );
  return rows[0];
};

const updateProfile = async (id, { name, phone }) => {
  const { rows } = await pool.query(
    `UPDATE caregivers
     SET name = COALESCE($2, name), phone = COALESCE($3, phone)
     WHERE id = $1
     RETURNING id, name, email, phone, role, updated_at`,
    [id, name, phone]
  );
  return rows[0] || null;
};

const updatePassword = async (id, hashedPassword) => {
  const { rowCount } = await pool.query(
    'UPDATE caregivers SET password = $2 WHERE id = $1',
    [id, hashedPassword]
  );
  return rowCount > 0;
};

const saveRefreshToken = async ({ caregiverId, token, expiresAt }) => {
  await pool.query(
    `INSERT INTO refresh_tokens (caregiver_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [caregiverId, token, expiresAt]
  );
};

const findRefreshToken = async (token) => {
  const { rows } = await pool.query(
    `SELECT rt.*, c.is_active AS caregiver_active
     FROM refresh_tokens rt
     JOIN caregivers c ON c.id = rt.caregiver_id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
};

const deleteRefreshToken = async (token) => {
  const { rowCount } = await pool.query(
    'DELETE FROM refresh_tokens WHERE token = $1',
    [token]
  );
  return rowCount > 0;
};

const deleteAllRefreshTokens = async (caregiverId) => {
  await pool.query(
    'DELETE FROM refresh_tokens WHERE caregiver_id = $1',
    [caregiverId]
  );
};

const cleanExpiredTokens = async () => {
  const { rowCount } = await pool.query(
    'DELETE FROM refresh_tokens WHERE expires_at <= NOW()'
  );
  return rowCount;
};

module.exports = {
  findByEmail,
  findById,
  create,
  updateProfile,
  updatePassword,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
  cleanExpiredTokens,
};