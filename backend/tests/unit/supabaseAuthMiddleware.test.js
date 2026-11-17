jest.mock('../../src/config/supabase', () => ({
  supabase: { auth: { getUser: jest.fn() } },
  isConfigured: true,
}));

jest.mock('../../src/modules/farmers/farmers.repository', () => ({
  findByAuthUserId: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
}));

const { authenticate, authenticateSupabase } = require('../../src/middleware/auth');
const { supabase } = require('../../src/config/supabase');
const farmerRepo = require('../../src/modules/farmers/farmers.repository');

function makeReq(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

describe('Supabase access token auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('links farmer by email and accepts Supabase access token', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-123', email: 'farmer@test.com' } },
      error: null,
    });
    farmerRepo.findByAuthUserId.mockResolvedValue(null);
    farmerRepo.findByEmail.mockResolvedValue({
      id: 'farmer-1',
      email: 'farmer@test.com',
      auth_user_id: null,
      is_active: true,
    });
    farmerRepo.update.mockResolvedValue({
      id: 'farmer-1',
      email: 'farmer@test.com',
      auth_user_id: 'auth-123',
      is_active: true,
    });

    const req = makeReq('supabase-access-token');
    const res = {};
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe('farmer-1');
    expect(farmerRepo.update).toHaveBeenCalledWith('farmer-1', { auth_user_id: 'auth-123' });
  });

  test('authenticateSupabase exposes auth user when no farmer profile exists', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-no-farmer', email: 'none@test.com', user_metadata: {} } },
      error: null,
    });
    farmerRepo.findByAuthUserId.mockResolvedValue(null);
    farmerRepo.findByEmail.mockResolvedValue(null);

    const req = makeReq('supabase-access-token');
    const res = {};
    const next = jest.fn();

    await authenticateSupabase(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.authUserId).toBe('auth-no-farmer');
    expect(req.authEmail).toBe('none@test.com');
    expect(req.user).toBeNull();
    expect(req.userId).toBeNull();
  });

  test('rejects invalid non-JWT tokens', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } });

    const req = makeReq('not-a-jwt');
    const res = {};
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_TOKEN');
  });
});
