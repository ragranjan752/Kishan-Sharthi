// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Admin & Department Official Routes (API v1)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const controller = require('./admin.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// All admin routes require role: admin or department_official
router.use('/admin', authenticate, requireRole('admin', 'department_official'));

router.get('/admin/stats', controller.getDashboardStats);
router.post('/admin/advisories', controller.publishAdvisory);
router.get('/admin/advisories', controller.getAdvisories);
router.put('/admin/schemes/:schemeId/verify', controller.verifyScheme);

module.exports = router;
