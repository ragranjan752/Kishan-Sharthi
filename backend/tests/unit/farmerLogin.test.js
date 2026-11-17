// ═══════════════════════════════════════════════════════════════════
//  Unit Tests: Farmer Login Credential Handling
// ═══════════════════════════════════════════════════════════════════

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-krishi-sarthi-auth-tests';

const farmerRepo = require('../../src/modules/farmers/farmers.repository');
const farmerService = require('../../src/modules/farmers/farmers.service');

describe('Farmer login credential handling', () => {
  test('migrates a legacy plaintext password_hash to bcrypt on successful login', async () => {
    const email = `legacy_${Date.now()}@testkisan.in`;

    await farmerRepo.create({
      name: 'Legacy Farmer',
      email,
      password_hash: 'PlainPass123',
      district: 'Patna',
      block: 'Bihta',
      land_size_kattha: 20,
      primary_crop: 'Dhan',
      role: 'farmer',
      is_active: true,
    });

    const result = await farmerService.login(email, 'PlainPass123');

    expect(result.token).toBeDefined();
    expect(result.farmer.email).toBe(email);

    const stored = await farmerRepo.findByEmail(email);
    expect(stored.password_hash).not.toBe('PlainPass123');
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);

    await expect(farmerService.login(email, 'WrongPass123')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
