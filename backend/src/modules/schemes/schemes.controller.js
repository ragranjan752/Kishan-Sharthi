// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Scheme Controller
// ═══════════════════════════════════════════════════════════════════

const schemeService = require('./schemes.service');
const farmerRepo = require('../farmers/farmers.repository');
const { sendSuccess, sendError, errors } = require('../../utils/response');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { schemeQuerySchema, checkEligibilitySchema } = require('./schemes.validator');

// GET /api/v1/schemes
const getAllSchemes = asyncHandler(async (req, res) => {
  const filters = schemeQuerySchema.parse(req.query);
  const schemes = await schemeService.getSchemeCatalog(filters);
  return sendSuccess(res, { schemes, count: schemes.length }, 'योजनाएं सफलतापूर्वक प्राप्त हुईं');
});

// GET /api/v1/schemes/farmer/:farmerId
const getFarmerEligibleSchemes = asyncHandler(async (req, res) => {
  const { farmerId } = req.params;

  let farmerProfile = null;
  if (req.user && (req.user.id === farmerId || req.user.role === 'admin')) {
    farmerProfile = req.user;
  } else {
    farmerProfile = await farmerRepo.findById(farmerId);
  }

  if (!farmerProfile) {
    throw new AppError('किसान प्रोफ़ाइल नहीं मिली', 404, 'FARMER_NOT_FOUND');
  }

  const results = await schemeService.getEligibleSchemesForFarmer(farmerProfile);
  const eligibleOnly = results.filter(r => r.is_eligible);

  return sendSuccess(res, {
    farmer: {
      name: farmerProfile.name,
      district: farmerProfile.district,
      block: farmerProfile.block,
      land_size_kattha: farmerProfile.land_size_kattha,
      primary_crop: farmerProfile.primary_crop
    },
    total_evaluated: results.length,
    eligible_count: eligibleOnly.length,
    schemes: results
  }, 'पात्रता मूल्यांकन परिणाम');
});

// POST /api/v1/schemes/check-eligibility (Ad-hoc simulation without profile login)
const checkEligibility = asyncHandler(async (req, res) => {
  const farmerData = checkEligibilitySchema.parse(req.body);
  const results = await schemeService.getEligibleSchemesForFarmer(farmerData);

  return sendSuccess(res, {
    input_criteria: farmerData,
    schemes: results
  }, 'पात्रता आंकलन पूर्ण');
});

// GET /api/v1/schemes/:schemeId
const getSchemeDetails = asyncHandler(async (req, res) => {
  const scheme = await schemeService.getSchemeDetailsWithGuide(req.params.schemeId);
  if (!scheme) {
    throw new AppError('योजना नहीं मिली', 404, 'SCHEME_NOT_FOUND');
  }
  return sendSuccess(res, { scheme }, 'योजना विवरण');
});

module.exports = {
  getAllSchemes,
  getFarmerEligibleSchemes,
  checkEligibility,
  getSchemeDetails
};
