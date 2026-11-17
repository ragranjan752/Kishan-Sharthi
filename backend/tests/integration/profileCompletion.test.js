// ═══════════════════════════════════════════════════════════════════
//  Integration Tests: Mandatory Farmer Profile Completion
// ═══════════════════════════════════════════════════════════════════

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-krishi-sarthi-auth-tests';

const request = require('supertest');
const app = require('../../src/app');

const baseFarmer = (email) => ({
  name: 'Profile Test Farmer',
  email,
  password: 'SecurePass@123',
  district: 'Patna',
  block: 'Bihta',
  land_size_kattha: 20,
  primary_crop: 'Dhan',
  farmer_category: 'small',
});

describe('Farmer profile completion', () => {
  test('GET /api/meta/locations exposes Bihar districts and block suggestions', async () => {
    const res = await request(app).get('/api/meta/locations');
    expect(res.status).toBe(200);
    expect(res.body.data.districts).toHaveLength(38);
    expect(res.body.data.blocksByDistrict.Patna).toContain('Bihta');
    expect(res.body.data.katthaPerBigha).toBe(20);
  });

  test('PUT /api/farmers/me/complete-profile requires authentication', async () => {
    const res = await request(app)
      .put('/api/farmers/me/complete-profile')
      .send({ name: 'X', phone: '9811111111', district: 'Patna', block: 'Bihta', land_size_kattha: 10, primary_crop: 'Dhan' });
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/json');
  });

  test('completes an incomplete farmer profile and marks it complete', async () => {
    const email = `cp_ok_${Date.now()}@testkisan.in`;
    const reg = await request(app).post('/api/auth/register').send(baseFarmer(email));
    expect(reg.status).toBe(201);
    expect(reg.body.user.profile_completed).toBe(false);

    const token = reg.body.token;
    const res = await request(app)
      .put('/api/farmers/me/complete-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Profile Complete Farmer', phone: '9811111111', district: 'Patna', block: 'Bihta', land_size_kattha: 12.5, primary_crop: 'Makhana' });

    expect(res.status).toBe(200);
    expect(res.body.data.farmer.profile_completed).toBe(true);
    expect(res.body.data.farmer.phone).toBe('9811111111');
    expect(res.body.data.farmer.land_size_kattha).toBe(12.5);

    const me = await request(app).get('/api/farmers/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.farmer.profile_completed).toBe(true);
  });

  test('rejects invalid mobile numbers with JSON validation error', async () => {
    const email = `cp_bad_${Date.now()}@testkisan.in`;
    const reg = await request(app).post('/api/auth/register').send(baseFarmer(email));
    const res = await request(app)
      .put('/api/farmers/me/complete-profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Bad Phone', phone: '12345', district: 'Patna', block: 'Bihta', land_size_kattha: 10, primary_crop: 'Dhan' });

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('rejects duplicate phone numbers across farmers', async () => {
    const first = await request(app).post('/api/auth/register').send(baseFarmer(`cp_a_${Date.now()}@testkisan.in`));
    await request(app)
      .put('/api/farmers/me/complete-profile')
      .set('Authorization', `Bearer ${first.body.token}`)
      .send({ name: 'First Farmer', phone: '9822222222', district: 'Patna', block: 'Bihta', land_size_kattha: 10, primary_crop: 'Dhan' });

    const second = await request(app).post('/api/auth/register').send(baseFarmer(`cp_b_${Date.now()}@testkisan.in`));
    const res = await request(app)
      .put('/api/farmers/me/complete-profile')
      .set('Authorization', `Bearer ${second.body.token}`)
      .send({ name: 'Second Farmer', phone: '9822222222', district: 'Gaya', block: 'Tikari', land_size_kattha: 8, primary_crop: 'Makka' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PHONE_EXISTS');
  });
});
