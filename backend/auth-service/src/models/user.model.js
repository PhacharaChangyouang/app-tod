const pool = require('../config/db');

async function findByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
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

async function setPhoneVerified(userId) {
  await pool.query('UPDATE users SET phone_verified = true WHERE id = $1', [userId]);
}

async function updatePin(userId, pinHash) {
  const { rows } = await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2 RETURNING *', [pinHash, userId]);
  return rows[0] || null;
}

module.exports = {
  findByPhone,
  findById,
  create,
  setPhoneVerified,
  updatePin,
};
