require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

/**
 * Refresh token ถูกเก็บใน DB แบบ hash (sha256) เท่านั้น ไม่เก็บ token ดิบ
 * เหตุผล: ถ้า DB รั่ว จะไม่สามารถเอา hash ไปใช้ล็อกอินแทน user ได้เลย
 * (ต่างจากรหัสผ่านที่คนพิมพ์เอง/สั้น/เดาได้ที่ต้อง bcrypt
 *  แต่ refresh token เป็น random string ที่มี entropy สูงอยู่แล้ว sha256 พอ
 *  และเร็วกว่า bcrypt มากเวลาต้อง lookup ด้วย token ทุก request)
 */

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

async function generateRefreshToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(token), expiresAt]
  );

  return token;
}

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

function verifyAccessToken(token) {
  return verifyToken(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return verifyToken(token, process.env.JWT_REFRESH_SECRET);
}

// ยังไม่หมดอายุ และยังไม่ถูก revoke (logout/ใช้ไปแล้ว)
async function isRefreshTokenValid(token) {
  const { rows } = await pool.query(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(token)]
  );
  return rows.length > 0;
}

async function revokeRefreshToken(token) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)]
  );
}

// เรียกตอน logout "ออกจากทุกอุปกรณ์" หรือลบ user
async function revokeAllForUser(userId) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllForUser,
};