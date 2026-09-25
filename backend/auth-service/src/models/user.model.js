const pool = require('../config/db');

async function findByPhone(phone) { const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]); return rows[0] || null; }
async function findByUsername(username) { const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]); return rows[0] || null; }
async function findById(id) { const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]); return rows[0] || null; }
async function findByCredentials(identifier) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1`, [identifier]);
  return rows[0] || null;
}
async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
  return rows[0] || null;
}
async function createWithPassword({ phone, name, age, role, username, email, passwordHash, pinHash }) {
  const { rows } = await pool.query(`INSERT INTO users (phone, name, age, role, username, email, password_hash, pin_hash, phone_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false) RETURNING *`, [phone, name || null, age || null, role, username, email || null, passwordHash, pinHash]);
  return rows[0];
}
async function updatePin(userId, pinHash) { const { rows } = await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2 RETURNING *', [pinHash, userId]); return rows[0] || null; }
async function updatePassword(userId, passwordHash) { const { rows } = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [passwordHash, userId]); return rows[0] || null; }
async function updateProfile(userId, { name, age }) {
  const { rows } = await pool.query(`UPDATE users SET name = COALESCE($2, name), age = COALESCE($3, age) WHERE id = $1 RETURNING *`, [userId, name ?? null, age ?? null]);
  return rows[0] || null;
}
module.exports = { findByPhone, findByUsername, findById, findByCredentials, findByEmail, createWithPassword, updatePin, updatePassword, updateProfile };
