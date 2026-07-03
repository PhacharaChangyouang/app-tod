/**
 * OTP Service — Mock mode สำหรับ dev
 *
 * เมื่อ OTP_MOCK_MODE=true:
 *   - ไม่ส่ง SMS จริง แค่ log ออก console
 *   - รหัส OTP fix ตาม OTP_MOCK_CODE (ค่าเริ่มต้น 123456)
 *
 * เก็บ OTP ไว้ใน memory ชั่วคราว (Map) — พอสำหรับ dev/demo
 * TODO (Sprint 4): ย้ายไปเก็บใน Redis + ต่อ SMS gateway จริง (Twilio/Thai Bulk SMS)
 */

const logger = require('../utils/logger');

const otpStore = new Map(); // phone -> { code, expiresAt }
const verifiedPhones = new Set();

const MOCK_MODE = process.env.OTP_MOCK_MODE === 'true';
const MOCK_CODE = process.env.OTP_MOCK_CODE || '123456';
const EXPIRES_MIN = Number(process.env.OTP_EXPIRES_IN_MINUTES || 5);

function generateCode() {
  if (MOCK_MODE) return MOCK_CODE;
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtp(phone) {
  const code = generateCode();
  const expiresAt = Date.now() + EXPIRES_MIN * 60 * 1000;
  otpStore.set(phone, { code, expiresAt });

  if (MOCK_MODE) {
    logger.info(`[MOCK SMS] OTP สำหรับ ${phone}: ${code} (หมดอายุใน ${EXPIRES_MIN} นาที)`);
  } else {
    // TODO: เรียก SMS gateway จริงที่นี่
    logger.warn('OTP_MOCK_MODE=false แต่ยังไม่ได้ต่อ SMS gateway จริง');
  }

  return { sent: true, expiresInMinutes: EXPIRES_MIN };
}

function verifyOtp(phone, code) {
  const entry = otpStore.get(phone);
  if (!entry) return { valid: false, reason: 'no_otp_requested' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, reason: 'expired' };
  }
  if (entry.code !== code) return { valid: false, reason: 'incorrect' };

  otpStore.delete(phone); // ใช้แล้วทิ้ง
  return { valid: true };
}

function markPhoneVerified(phone) {
  verifiedPhones.add(phone);
}

function isPhoneVerified(phone) {
  return verifiedPhones.has(phone);
}

function clearPhoneVerification(phone) {
  verifiedPhones.delete(phone);
}

module.exports = {
  sendOtp,
  verifyOtp,
  markPhoneVerified,
  isPhoneVerified,
  clearPhoneVerification,
};
