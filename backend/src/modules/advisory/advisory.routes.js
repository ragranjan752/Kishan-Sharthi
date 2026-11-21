const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { sendSuccess } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const advisory = require('./advisory.service');
const farmerRepo = require('../farmers/farmers.repository');

// GET /api/advisory — personalized real advisory for logged-in farmer
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const farmer = await farmerRepo.findById(req.userId);
  const data = await advisory.getAdvisory(farmer || {});
  return sendSuccess(res, data, 'Advisory generated');
}));

module.exports = router;
