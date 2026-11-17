// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer & Auth Routes (API v1)
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const controller = require('./farmers.controller');
const { authenticate, authenticateSupabase, requireRole } = require('../../middleware/auth');

// ── Auth Endpoints (Public) ──
router.post('/auth/register', controller.register);
router.post('/auth/login', controller.login);
router.post('/auth/google', controller.googleLogin);
router.post('/auth/forgot-password', controller.forgotPassword);
router.post('/auth/reset-password', controller.resetPassword);

// ── Authenticated User Endpoints ──
router.get('/auth/me', authenticate, controller.getMe);
router.post('/farmers/bootstrap', authenticateSupabase, controller.bootstrapProfile);
router.get('/farmers/me', authenticate, controller.getMe);
router.put('/farmers/me/complete-profile', authenticate, controller.completeProfile);
router.get('/farmers/:farmerId', authenticate, controller.getProfile);
router.put('/farmers/:farmerId', authenticate, controller.updateProfile);

// ── Phone lookup (internal / authorized) ──
router.get('/farmers/phone/:phone', authenticate, controller.getByPhone);

// ── Admin: Farmer management ──
router.get('/admin/farmers', authenticate, requireRole('admin'), controller.listFarmers);

module.exports = router;
