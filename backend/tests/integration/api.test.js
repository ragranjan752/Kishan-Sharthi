// ═══════════════════════════════════════════════════════════════════
//  Integration Tests: API Endpoints & Backwards Compatibility
// ═══════════════════════════════════════════════════════════════════

const request = require('supertest');
const app = require('../../src/app');

describe('Core API Endpoints & Backward Compatibility', () => {
  test('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
  });

  test('GET /api/v1/schemes returns list of verified schemes', async () => {
    const res = await request(app).get('/api/v1/schemes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.schemes.length).toBeGreaterThan(0);
    expect(res.body.data.schemes[0].source_url).toBeDefined();
  });

  test('POST /api/v1/schemes/check-eligibility evaluates simulated farmer', async () => {
    const res = await request(app)
      .post('/api/v1/schemes/check-eligibility')
      .send({
        district: 'Darbhanga',
        land_size_kattha: 40,
        primary_crop: 'Makhana'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.schemes).toBeDefined();
    expect(res.body.data.schemes.some(s => s.scheme_name.includes('Makhana'))).toBe(true);
  });

  test('POST /api/v1/sarthi/chat responds with agronomic advice and safety disclaimer', async () => {
    const res = await request(app)
      .post('/api/v1/sarthi/chat')
      .send({
        message: 'Dhan me kit ke bachav ke upay bataye',
        farmerId: 'guest-test'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.safety_disclaimer).toBeDefined();
  });

  test('Legacy alias GET /api/mandi returns mandi prices for legacy frontend', async () => {
    const res = await request(app).get('/api/mandi');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/v1/admin/stats is protected and rejects non-admin requests', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });
});
