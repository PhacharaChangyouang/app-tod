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
async function findByGoogleSub(googleSub) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_sub = $1 LIMIT 1', [googleSub]);
  return rows[0] || null;
}
async function createWithPassword({ phone, name, age, role, username, email, passwordHash, pinHash, legalVersion }) {
  const { rows } = await pool.query(`INSERT INTO users (phone, name, age, role, username, email, password_hash, pin_hash, phone_verified, terms_accepted_at, terms_version, privacy_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, now(), $9, $9) RETURNING *`, [phone, name || null, age || null, role, username, email || null, passwordHash, pinHash, legalVersion]);
  return rows[0];
}
async function createWithGoogle({ phone, name, age, role, email, pinHash, googleSub, avatarUrl, legalVersion }) {
  const { rows } = await pool.query(`
    INSERT INTO users
      (phone, name, age, role, email, pin_hash, google_sub, avatar_url,
       phone_verified, terms_accepted_at, terms_version, privacy_version)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, now(), $9, $9)
    RETURNING *
  `, [phone, name || null, age || null, role, email, pinHash, googleSub, avatarUrl || null, legalVersion]);
  return rows[0];
}
async function linkGoogleIdentity(userId, { googleSub, avatarUrl }) {
  const { rows } = await pool.query(`
    UPDATE users
    SET google_sub = COALESCE(google_sub, $2),
        avatar_url = COALESCE(avatar_url, $3)
    WHERE id = $1 AND (google_sub IS NULL OR google_sub = $2)
    RETURNING *
  `, [userId, googleSub, avatarUrl || null]);
  return rows[0] || null;
}
async function updatePin(userId, pinHash) { const { rows } = await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2 RETURNING *', [pinHash, userId]); return rows[0] || null; }
async function updatePassword(userId, passwordHash) { const { rows } = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [passwordHash, userId]); return rows[0] || null; }
async function updateProfile(userId, { name, age }) {
  const { rows } = await pool.query(`UPDATE users SET name = COALESCE($2, name), age = COALESCE($3, age) WHERE id = $1 RETURNING *`, [userId, name ?? null, age ?? null]);
  return rows[0] || null;
}
module.exports = { findByPhone, findByUsername, findById, findByCredentials, findByEmail, findByGoogleSub, createWithPassword, createWithGoogle, linkGoogleIdentity, updatePin, updatePassword, updateProfile };
