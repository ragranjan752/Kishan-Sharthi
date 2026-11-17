// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Scheme Routes (API v1)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const controller = require('./schemes.controller');
const { optionalAuth } = require('../../middleware/auth');

// Public catalog and ad-hoc eligibility check
router.get('/schemes', controller.getAllSchemes);
router.post('/schemes/check-eligibility', controller.checkEligibility);
router.get('/schemes/:schemeId', controller.getSchemeDetails);

// Farmer-specific eligible schemes (optionalAuth loads profile if token provided)
router.get('/schemes/farmer/:farmerId', optionalAuth, controller.getFarmerEligibleSchemes);

module.exports = router;
