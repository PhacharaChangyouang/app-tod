const pool = require('../config/db');

async function findByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function findByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByCredentials(identifier) {
  const { rows } = await pool.query(
    `SELECT * FROM users
     WHERE LOWER(username) = LOWER($1)
        OR LOWER(email) = LOWER($1)
     LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
}

async function create({ phone, name, age, role, pinHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (phone, name, age, role, pin_hash, phone_verified)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [phone, name || null, age || null, role, pinHash]
  );
  return rows[0];
}

async function createWithPassword({ phone, name, age, role, pinHash, username, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (phone, name, age, role, pin_hash, username, email, password_hash, phone_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING *`,
    [phone, name || null, age || null, role, pinHash, username, email || null, passwordHash]
  );
  return rows[0];
}

async function setPhoneVerified(userId) {
  await pool.query('UPDATE users SET phone_verified = true WHERE id = $1', [userId]);
}

async function updatePin(userId, pinHash) {
  const { rows } = await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2 RETURNING *', [pinHash, userId]);
  return rows[0] || null;
}

async function updateProfile(userId, { name, age, role }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         age = COALESCE($3, age),
         role = COALESCE($4, role)
     WHERE id = $1
     RETURNING *`,
    [userId, name ?? null, age ?? null, role ?? null]
  );
  return rows[0] || null;
}

async function updatePhone(userId, phone) {
  const { rows } = await pool.query(
    `UPDATE users SET phone = $2, phone_verified = true WHERE id = $1 RETURNING *`,
    [userId, phone]
  );
  return rows[0] || null;
}

module.exports = {
  findByPhone,
  findByUsername,
  findById,
  findByCredentials,
  create,
  createWithPassword,
  setPhoneVerified,
  updatePin,
  updateProfile,
  updatePhone,
};
