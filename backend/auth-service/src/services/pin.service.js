const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 12;
const PEPPERED_PREFIX = 'p1$';

function pepperKey() {
  return process.env.PIN_PEPPER || process.env.INTERNAL_API_KEY || 'local-development-only-pin-pepper';
}

function pepperedValue(pin) {
  return crypto.createHmac('sha256', pepperKey()).update(String(pin)).digest('hex');
}

async function hashPin(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('PIN must be exactly 4 digits');
  return `${PEPPERED_PREFIX}${await bcrypt.hash(pepperedValue(pin), SALT_ROUNDS)}`;
}

async function verifyPin(pin, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash) return { valid: false, needsUpgrade: false };
  if (storedHash.startsWith(PEPPERED_PREFIX)) {
    const valid = await bcrypt.compare(pepperedValue(pin), storedHash.slice(PEPPERED_PREFIX.length));
    return { valid, needsUpgrade: false };
  }

  // Compatibility path for active accounts created before PIN peppering.
  const valid = await bcrypt.compare(String(pin || ''), storedHash);
  return { valid, needsUpgrade: valid };
}

module.exports = { hashPin, verifyPin };
