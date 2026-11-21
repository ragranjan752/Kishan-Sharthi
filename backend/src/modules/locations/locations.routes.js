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


// GET /locations/geocode?village=X&subdistrict=Y&district=Z&state=W — resolve to lat/lng via Nominatim
router.get('/geocode', asyncHandler(async (req, res) => {
  const { village, subdistrict, district, state } = req.query;
  const parts = [village, subdistrict, district, state, 'India'].filter(Boolean);
  if (parts.length < 2) return sendSuccess(res, { lat: null, lng: null }, 'Insufficient location');
  const q = encodeURIComponent(parts.join(', '));
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + q, {
      headers: { 'User-Agent': 'KisanSarthi/1.0 (agri-assistant)' }
    });
    const data = await r.json();
    if (!data || !data[0]) return sendSuccess(res, { lat: null, lng: null }, 'Location not found');
    return sendSuccess(res, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }, 'Location resolved');
  } catch (e) {
    return sendSuccess(res, { lat: null, lng: null }, 'Geocode failed');
  }
}));

module.exports = router;
