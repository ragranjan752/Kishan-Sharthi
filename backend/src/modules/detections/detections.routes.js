// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Disease Detection Routes (API v1)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const controller = require('./detections.controller');
const { uploadMiddleware } = require('./detections.validator');
const { optionalAuth, authenticate, requireRole } = require('../../middleware/auth');

// Image upload and detection start
router.post('/detections/upload', optionalAuth, uploadMiddleware.single('image'), controller.uploadAndScan);

// Result lookups
router.get('/detections/:detectionId', controller.getResult);
router.get('/detections/farmer/:farmerId', controller.getFarmerHistory);

// Agronomist or Admin Expert Verification
router.post(
  '/detections/:detectionId/expert-verify',
  authenticate,
  requireRole('admin', 'agronomist', 'department_official'),
  controller.expertVerify
);

module.exports = router;
