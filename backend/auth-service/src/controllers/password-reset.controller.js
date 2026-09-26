const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');
const resetRateLimit = require('../services/password-reset-rate-limit.service');

const SALT_ROUNDS = 12;
const RESET_MINUTES = 15;

function hashResetToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function uniformResetDelay(startedAt) {
  const targetMs = 800 + crypto.randomInt(0, 201);
  const remaining = targetMs - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

async function requestReset(req, res, next) {
  const startedAt = Date.now();
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
    const rateLimit = await resetRateLimit.consume(req, email);
    const user = await userModel.findByEmail(email);
    if (!user) {
      await uniformResetDelay(startedAt);
      return res.json({ success: true, message: 'ถ้าอีเมลนี้มีบัญชี AHA ระบบจะส่งลิงก์ให้', cooldownSeconds: rateLimit.cooldownSeconds });
    }

    await pool.query('DELETE FROM password_reset_tokens WHERE expires_at <= now() OR used_at IS NOT NULL');
    // A resend invalidates the previous link so only the latest email works.
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [user.id]);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    await pool.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 * interval '1 minute'))`, [user.id, tokenHash, RESET_MINUTES]);

    try {
      await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token: rawToken });
    } catch (emailError) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      console.error('Password reset email failed:', emailError.message);
    }

    await uniformResetDelay(startedAt);
    res.json({ success: true, message: 'ถ้าอีเมลนี้มีบัญชี AHA ระบบจะส่งลิงก์ให้', cooldownSeconds: rateLimit.cooldownSeconds });
  } catch (err) {
    if (err.status === 429) {
      res.set('Retry-After', String(err.retryAfterSeconds));
      return res.status(429).json({ success: false, message: err.message, retryAfterSeconds: err.retryAfterSeconds });
    }
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!/^[0-9a-f]{64}$/i.test(String(token || ''))) return res.status(400).json({ success: false, message: 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(String(password || '')) || Buffer.byteLength(String(password || ''), 'utf8') > 72) return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมี 8–72 ไบต์ และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข' });

    const tokenHash = hashResetToken(String(token));
    const { rows } = await pool.query(`
      UPDATE password_reset_tokens
      SET used_at = now()
      WHERE id = (
        SELECT id FROM password_reset_tokens
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [tokenHash]);
    const reset = rows[0];
    if (!reset) return res.status(400).json({ success: false, message: 'ลิงก์หมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่' });

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const user = await userModel.updatePassword(reset.user_id, passwordHash);
    if (!user) return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งาน' });

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2', [reset.user_id, reset.id]);
    await tokenService.revokeAllForUser(reset.user_id);

    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err) { next(err); }
}

module.exports = { requestReset, resetPassword };
