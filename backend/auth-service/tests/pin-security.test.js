process.env.INTERNAL_API_KEY = 'test-pin-pepper-value-with-enough-randomness-123456789';

const bcrypt = require('bcryptjs');
const pinService = require('../src/services/pin.service');

describe('PIN hashing compatibility', () => {
  it('hashes new PINs with a versioned server-side pepper', async () => {
    const hash = await pinService.hashPin('4826');
    expect(hash.startsWith('p1$')).toBe(true);
    await expect(pinService.verifyPin('4826', hash)).resolves.toEqual({ valid: true, needsUpgrade: false });
    await expect(pinService.verifyPin('0000', hash)).resolves.toEqual({ valid: false, needsUpgrade: false });
  });

  it('accepts an existing bcrypt PIN hash and marks it for transparent upgrade', async () => {
    const legacyHash = await bcrypt.hash('4826', 10);
    await expect(pinService.verifyPin('4826', legacyHash)).resolves.toEqual({ valid: true, needsUpgrade: true });
    await expect(pinService.verifyPin('0000', legacyHash)).resolves.toEqual({ valid: false, needsUpgrade: false });
  });

  it('rejects PIN values that are not exactly four digits', async () => {
    await expect(pinService.hashPin('12345')).rejects.toThrow('PIN must be exactly 4 digits');
  });
});
