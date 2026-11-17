// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — AI Sarthi Routes (API v1)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const controller = require('./sarthi.controller');
const { optionalAuth } = require('../../middleware/auth');

router.post('/sarthi/chat', optionalAuth, controller.chat);
// Alias used by the static frontend (/api/ai/chat)
router.post('/ai/chat', optionalAuth, controller.chat);

module.exports = router;
