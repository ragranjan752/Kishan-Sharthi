// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Pan-India Location Routes (LGD)
//  Mounted under /api/v1/locations and /api/locations (legacy alias)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { sendSuccess } = require('../../utils/response');
const locations = require('./locations.service');

// GET /locations/states — all 28 states + 8 UTs
router.get('/states', asyncHandler(async (req, res) => {
  const states = await locations.listStates();
  return sendSuccess(res, states, 'States & Union Territories');
}));

// GET /locations/districts?stateCode=35
router.get('/districts', asyncHandler(async (req, res) => {
  const districts = await locations.listDistricts(req.query.stateCode);
  return sendSuccess(res, districts, 'Districts');
}));

// GET /locations/subdistricts?districtCode=603
router.get('/subdistricts', asyncHandler(async (req, res) => {
  const subdistricts = await locations.listSubdistricts(req.query.districtCode);
  return sendSuccess(res, subdistricts, 'Sub-districts');
}));

// GET /locations/villages?subdistrictCode=5916&q=arong&limit=50
router.get('/villages', asyncHandler(async (req, res) => {
  const villages = await locations.searchVillages(
    req.query.subdistrictCode,
    req.query.q || '',
    req.query.limit
  );
  return sendSuccess(res, villages, 'Villages');
}));

module.exports = router;
