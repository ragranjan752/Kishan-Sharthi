// ═══════════════════════════════════════════════════════════════════
//  Unit Tests: Firebase Social Sign-In → Farmer Profile Linking
// ═══════════════════════════════════════════════════════════════════

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-krishi-sarthi-auth-tests';

const mockVerifyIdToken = jest.fn();

jest.mock('../../config/firebase', () => ({
  admin: {
    auth: () => ({ verifyIdToken: mockVerifyIdToken }),
  },
  isConfigured: true,
}));

const farmerRepo = require('../../src/modules/farmers/farmers.repository');
const farmerService = require('../../src/modules/farmers/farmers.service');

describe('Firebase social sign-in', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test('creates a farmer profile on first Google sign-in and reuses it on login', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'google-uid-123',
      email: 'Google.User@TestKisan.in',
      name: 'Google User',
      picture: 'https://example.com/avatar.png',
    });

    const first = await farmerService.loginWithFirebase('google', 'valid-id-token', {
      email: 'google.user@testkisan.in',
      displayName: 'Google User',
      photoURL: 'https://example.com/avatar.png',
    });

    expect(first.token).toBeDefined();
    expect(first.farmer.email).toBe('google.user@testkisan.in');
    expect(first.farmer.password_hash).toBeUndefined();
    expect(first.farmer.profile_image_url).toBe('https://example.com/avatar.png');

    const stored = await farmerRepo.findByEmail('google.user@testkisan.in');
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);

    const second = await farmerService.loginWithFirebase('google', 'valid-id-token', {});
    expect(second.farmer.id).toBe(first.farmer.id);
  });

  test('rejects invalid Firebase ID tokens', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));

    await expect(
      farmerService.loginWithFirebase('google', 'bad-id-token', {})
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_ID_TOKEN' });
  });
});
