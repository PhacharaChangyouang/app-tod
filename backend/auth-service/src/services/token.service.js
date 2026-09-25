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
      algorithm: 'HS256',
      issuer: 'aha-auth-service',
      audience: 'aha-api',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    }
  );
}

async function generateRefreshToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'aha-auth-service',
      audience: 'aha-refresh',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
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

function verifyToken(token, secret, audience) {
  try {
    if (typeof token !== 'string' || token.length > 4096) return null;
    return jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'aha-auth-service',
      audience,
      clockTolerance: 5,
    });
  } catch (err) {
    return null;
  }
}

function verifyAccessToken(token) {
  return verifyToken(token, process.env.JWT_SECRET, 'aha-api');
}

function verifyRefreshToken(token) {
  return verifyToken(token, process.env.JWT_REFRESH_SECRET, 'aha-refresh');
}

// Atomically consume a refresh token. Only one concurrent request can win.
// The expiry predicate is part of the UPDATE so validity and revocation cannot race.
async function consumeRefreshToken(token) {
  const { rows } = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hashToken(token)]
  );
  return rows[0] || null;
}

// Kept for non-consuming checks when needed; refresh must use consumeRefreshToken.
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
  consumeRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
