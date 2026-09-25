const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');

const SALT_ROUNDS = 10;
const RESET_MINUTES = 15;

function hashResetToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

async function requestReset(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
    const user = await userModel.findByEmail(email);
    if (!user) return res.json({ success: true, message: 'ถ้าอีเมลนี้มีบัญชี AHA ระบบจะส่งลิงก์ให้' });

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= now()', [user.id]);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    await pool.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 * interval '1 minute'))`, [user.id, tokenHash, RESET_MINUTES]);

    try {
      await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token: rawToken });
    } catch (emailError) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      emailError.statusCode = 503;
      throw emailError;
    }

    res.json({ success: true, message: 'ถ้าอีเมลนี้มีบัญชี AHA ระบบจะส่งลิงก์ให้' });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
    if (!/^(?=.*[A-Za-z])(?=.*\d).{12,72}$/.test(String(password || ''))) return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมี 12–72 ตัว และมีทั้งตัวอักษรภาษาอังกฤษกับตัวเลข' });

    const tokenHash = hashResetToken(String(token));
    const { rows } = await pool.query(`SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() LIMIT 1`, [tokenHash]);
    const reset = rows[0];
    if (!reset) return res.status(400).json({ success: false, message: 'ลิงก์หมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่' });

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const user = await userModel.updatePassword(reset.user_id, passwordHash);
    if (!user) return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งาน' });

    await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [reset.id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2', [reset.user_id, reset.id]);
    await tokenService.revokeAllForUser(reset.user_id);

    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err) { next(err); }
}

module.exports = { requestReset, resetPassword };
