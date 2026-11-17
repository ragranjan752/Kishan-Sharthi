// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — AI Sarthi Controller
// ═══════════════════════════════════════════════════════════════════

const sarthiService = require('./sarthi.service');
const farmerRepo = require('../farmers/farmers.repository');
const { sendSuccess } = require('../../utils/response');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { z } = require('zod');

const chatInputSchema = z.object({
  message: z.string().min(1, 'संदेश रिक्त नहीं हो सकता').max(1000, 'संदेश 1000 अक्षरों से कम होना चाहिए'),
  farmerId: z.string().optional(),
  sessionId: z.string().optional(),
  lang: z.string().max(20).optional()
});

// POST /api/v1/sarthi/chat
const chat = asyncHandler(async (req, res) => {
  const { message, farmerId, sessionId, lang } = chatInputSchema.parse(req.body);

  let farmer = req.user || {};
  if (!farmer.id && farmerId) {
    const fetched = await farmerRepo.findById(farmerId);
    if (fetched) farmer = fetched;
  }

  const result = await sarthiService.processFarmerChat({
    message,
    farmer,
    sessionId,
    lang
  });

  return sendSuccess(res, result, 'उत्तर तैयार है');
});

module.exports = {
  chat
};
