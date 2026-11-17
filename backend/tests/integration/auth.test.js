// ═══════════════════════════════════════════════════════════════════
//  Integration Tests: Authentication & Security Controls
// ═══════════════════════════════════════════════════════════════════

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-krishi-sarthi-auth-tests';

const request = require('supertest');
const app = require('../../src/app');

describe('Farmer Authentication API', () => {
  const testFarmer = {
    name: 'Suresh Choudhary',
    phone: '9812345678',
    email: `suresh_${Date.now()}@testkisan.in`,
    password: 'SecurePass@123',
    district: 'Patna',
    block: 'Bihta',
    land_size_kattha: 30,
    primary_crop: 'Dhan',
    farmer_category: 'small'
  };

  let authToken = '';

  test('POST /api/v1/auth/register creates a farmer and returns JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testFarmer);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.farmer.email).toBe(testFarmer.email.toLowerCase());
    expect(res.body.data.farmer.password_hash).toBeUndefined(); // Password hash must NEVER leak
    expect(res.body.data.farmer.password).toBeUndefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testFarmer.email.toLowerCase());
    expect(res.body.token).toBeDefined();

    authToken = res.body.data.token;
  });

  test('POST /api/v1/auth/login authenticates with bcrypt and valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testFarmer.email,
        password: testFarmer.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testFarmer.email.toLowerCase());
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/v1/auth/login rejects incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testFarmer.email,
        password: 'WrongPassword@999'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid email or password');
  });

  test('POST /api/v1/auth/login returns JSON validation errors instead of HTML', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/v1/auth/google returns JSON when social auth is unavailable', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'test-id-token' });

    expect(res.status).toBe(503);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SOCIAL_AUTH_UNAVAILABLE');
  });

  test('unknown API routes return JSON 404 instead of auth/HTML errors', async () => {
    const res = await request(app)
      .post('/api/definitely-not-a-route')
      .send({});

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });

  test('GET /api/v1/auth/me returns current user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.farmer).toBeDefined();
  });

  test('GET /api/v1/auth/me rejects unauthenticated request without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
