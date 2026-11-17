// Demo auth is development-only and must never weaken production auth.
process.env.NODE_ENV = 'development';
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'demo-test-secret-0123456789abcdef0123456789';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const demoRoutes = require('../../src/modules/demo/demo.routes');
const { authenticate } = require('../../src/middleware/auth');
const { DEMO_FARMER_ID, isDemoModeEnabled } = require('../../src/config/demo');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/demo', demoRoutes);
  app.get('/protected', authenticate, (req, res) => {
    res.json({ success: true, user: req.user, isDemo: req.isDemo === true });
  });
  return app;
}

describe('Demo authentication', () => {
  const app = buildApp();

  test('status reports demo mode enabled in development', async () => {
    expect(isDemoModeEnabled()).toBe(true);
    const res = await request(app).get('/api/demo/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, enabled: true, mode: 'development' });
  });

  test('login returns demo user and signed token', async () => {
    const res = await request(app).post('/api/demo/login').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({ id: DEMO_FARMER_ID, isDemo: true, role: 'farmer' });
    expect(typeof res.body.token).toBe('string');
  });

  test('demo token accesses protected farmer route without DB lookup', async () => {
    const login = await request(app).post('/api/demo/login').send({});
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(DEMO_FARMER_ID);
    expect(res.body.isDemo).toBe(true);
  });

  test('invalid token is rejected', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  test('expired demo token is rejected', async () => {
    const expired = jwt.sign(
      { id: DEMO_FARMER_ID, demo: true, role: 'farmer' },
      process.env.JWT_SECRET,
      { expiresIn: '1ms' }
    );
    await new Promise((r) => setTimeout(r, 20));
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('demo login is rejected when NODE_ENV is not development', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).post('/api/demo/login').send({});
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
