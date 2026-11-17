process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-krishi-sarthi-auth-tests';

const farmerService = require('../../src/modules/farmers/farmers.service');

describe('Supabase farmer bootstrap', () => {
  test('creates a complete farmer profile from Supabase metadata', async () => {
    const authUser = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'newfarmer@testkisan.in',
      user_metadata: {
        name: 'New Farmer',
        phone: '9812345678',
        district: 'Patna',
        block: 'Bihta',
        land_size_kattha: 10,
        primary_crop: 'Dhan',
      },
    };

    const farmer = await farmerService.bootstrapProfile(authUser);

    expect(farmer.id).toBe(authUser.id);
    expect(farmer.auth_user_id).toBe(authUser.id);
    expect(farmer.email).toBe('newfarmer@testkisan.in');
    expect(farmer.phone).toBe('9812345678');
    expect(farmer.profile_completed).toBe(true);
    expect(farmer.password_hash).toBeUndefined();
  });

  test('creates an incomplete profile when metadata is missing', async () => {
    const authUser = {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'minimal@testkisan.in',
      user_metadata: { full_name: 'Minimal User' },
    };

    const farmer = await farmerService.bootstrapProfile(authUser);

    expect(farmer.id).toBe(authUser.id);
    expect(farmer.auth_user_id).toBe(authUser.id);
    expect(farmer.name).toBe('Minimal User');
    expect(farmer.profile_completed).toBe(false);
    expect(farmer.district).toBe('Not specified');
  });

  test('bootstrap is idempotent for the same Supabase user', async () => {
    const authUser = {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'repeat@testkisan.in',
      user_metadata: { name: 'Repeat Farmer' },
    };

    const first = await farmerService.bootstrapProfile(authUser);
    const second = await farmerService.bootstrapProfile(authUser);

    expect(second.id).toBe(first.id);
    expect(second.auth_user_id).toBe(authUser.id);
  });
});
