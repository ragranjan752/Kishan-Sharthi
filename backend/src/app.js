// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Express Application Setup (Modular v2)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route Modules
const farmerRoutes = require('./modules/farmers/farmers.routes');
const schemeRoutes = require('./modules/schemes/schemes.routes');
const detectionRoutes = require('./modules/detections/detections.routes');
const sarthiRoutes = require('./modules/sarthi/sarthi.routes');
const mandiRoutes = require('./modules/mandi/mandi.routes');
const toolRoutes = require('./modules/tools/tools.routes');
const communityRoutes = require('./modules/community/community.routes');
const miscRoutes = require('./modules/misc/misc.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const demoRoutes = require('./modules/demo/demo.routes');
const locationRoutes = require('./modules/locations/locations.routes');
const advisoryRoutes = require('./modules/advisory/advisory.routes');
const learningRoutes = require('./modules/learning/learning.routes');

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';

// Render (and other PaaS) sit behind a proxy — trust the first hop so
// express-rate-limit reads the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

// ── 1. Security Headers ──
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline scripts in frontend app.js
  crossOriginEmbedderPolicy: false
}));

// ── 2. CORS Whitelisting ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().replace(/\/$/, ''))
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, postman, same-origin)
    if (!origin) {
      return callback(null, true);
    }
    // Explicitly allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Auto-allow any Render deployment domain or localhost
    if (
      /^https?:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    ) {
      return callback(null, true);
    }
    // Development fallback
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── 3. Performance & Body Parsing ──
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 4. Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, error: 'अनुरोध सीमा पार हो गई है (Too many requests, please try again later)' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'अत्यधिक लॉगिन प्रयास। कृपया 15 मिनट बाद पुनः प्रयास करें।' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use('/api/v1/auth/', authLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/demo/', authLimiter);
app.use('/api/v1/demo/', authLimiter);

// ── 5. Static Assets ──
const backendRoot = path.resolve(__dirname, '..');
const frontendPath = path.resolve(__dirname, '../../frontend');
const frontendAssetsPath = path.join(frontendPath, 'public', 'assets');
app.use(express.static(frontendPath));
app.use('/assets', express.static(frontendAssetsPath));
app.use('/uploads', express.static(path.join(backendRoot, 'uploads')));

// ── 6. Health Check ──
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    platform: 'Krishi Sarthi — Bihar Edition',
    version: '2.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ── 7. Demo Auth (development only) ──
app.use('/api/demo', demoRoutes);
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/v1/detections/upload', aiLimiter);
app.use('/api/detections/upload', aiLimiter);
app.use('/api/v1/sarthi/chat', aiLimiter);
app.use('/api/sarthi/chat', aiLimiter);
app.use('/api/v1/demo', demoRoutes);

// ── 8. Versioned API Routes (/api/v1) ──
app.use('/api/v1', farmerRoutes);
app.use('/api/v1', schemeRoutes);
app.use('/api/v1', detectionRoutes);
app.use('/api/v1', sarthiRoutes);
app.use('/api/v1', mandiRoutes);
app.use('/api/v1', toolRoutes);
app.use('/api/v1', communityRoutes);
app.use('/api/v1', miscRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1/locations', locationRoutes);

// ── 8. Backwards-Compatible Legacy Aliases (/api) ──
// Ensures existing index.html and app.js frontend functions continue working seamlessly
app.use('/api', farmerRoutes);
app.use('/api', schemeRoutes);
app.use('/api', detectionRoutes);
app.use('/api', sarthiRoutes);
app.use('/api', mandiRoutes);
app.use('/api', toolRoutes);
app.use('/api', communityRoutes);
app.use('/api', miscRoutes);
app.use('/api', adminRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/learning', learningRoutes);

// ── 9. Error Handling & 404 Handlers ──
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
