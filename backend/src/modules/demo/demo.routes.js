// ═══════════════════════════════════════════════
//  Krishi Sarthi — Demo Auth Routes (Dev Only)
// ═══════════════════════════════════════════════

const express = require('express');
const { isDemoModeEnabled, demoProfile, issueDemoToken } = require('../../config/demo');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    success: true,
    enabled: isDemoModeEnabled(),
    mode: process.env.NODE_ENV || 'development',
  });
});

router.post('/login', (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(403).json({
      success: false,
      error: 'Demo mode is disabled',
    });
  }

  return res.json({
    success: true,
    message: 'Demo login successful',
    user: demoProfile(),
    token: issueDemoToken(),
  });
});

module.exports = router;
