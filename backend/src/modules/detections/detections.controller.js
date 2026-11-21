// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Disease Detection Controller
// ═══════════════════════════════════════════════════════════════════

const detectionService = require('./detections.service');
const learning = require('../learning/learning.service');
const { sendSuccess, sendCreated, errors } = require('../../utils/response');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

// POST /api/v1/detections/upload
const uploadAndScan = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('कृपया फसल की पत्ती की छवि अपलोड करें (Image required)', 400, 'NO_FILE_UPLOADED');
  }

  const farmerId = req.user ? req.user.id : null; // anonymous uploads cannot claim a farmerId
  const crop = req.body.crop || (req.user ? req.user.primary_crop : 'Dhan');

  const record = await detectionService.initiateDetection({
    file: req.file,
    farmerId,
    crop
  });

  return sendCreated(res, record, 'छवि सफलतापूर्वक अपलोड हुई। एआई विश्लेषण प्रक्रियाधीन है।');
});

// GET /api/v1/detections/:detectionId
const getResult = asyncHandler(async (req, res) => {
  const result = await detectionService.getDetectionById(req.params.detectionId);
  if (result && result.id) {
    learning.queueDiseaseLabel({
      detection_id: result.id,
      image_ref: result.image_url || result.image_path || null,
      predicted_crop: result.crop || result.predicted_crop || null,
      predicted_disease: result.disease_name || result.predicted_disease || null,
      confidence: result.confidence || null
    }).catch(() => {});
  }
  if (result && result.farmer_id && req.user && req.user.id !== result.farmer_id && (req.user.role || 'farmer') !== 'admin') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (!result) {
    throw new AppError('जांच परिणाम नहीं मिला', 404, 'DETECTION_NOT_FOUND');
  }
  return sendSuccess(res, { detection: result }, 'जांच परिणाम प्राप्त');
});

// GET /api/v1/detections/farmer/:farmerId
const getFarmerHistory = asyncHandler(async (req, res) => {
  const list = await detectionService.getFarmerDetections(req.params.farmerId);
  return sendSuccess(res, { history: list, total: list.length }, 'किसान रोग जांच इतिहास');
});

// POST /api/v1/detections/:detectionId/expert-verify (agronomist / admin only)
const expertVerify = asyncHandler(async (req, res) => {
  const { confirmedDisease, notes } = req.body;
  const verified = await detectionService.verifyDetectionByExpert(
    req.params.detectionId,
    req.user || { id: 'admin' },
    { confirmedDisease, notes }
  );

  if (!verified) {
    throw new AppError('जांच रिकॉर्ड नहीं मिला', 404, 'DETECTION_NOT_FOUND');
  }

  return sendSuccess(res, { detection: verified }, 'विशेषज्ञ सत्यापन सफलतापूर्वक दर्ज किया गया');
});

module.exports = {
  uploadAndScan,
  getResult,
  getFarmerHistory,
  expertVerify
};
