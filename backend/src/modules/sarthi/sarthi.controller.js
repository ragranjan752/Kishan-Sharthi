// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — AI Sarthi Controller
// ═══════════════════════════════════════════════════════════════════

const sarthiService = require('./sarthi.service');
const learning = require('../learning/learning.service');
const farmerRepo = require('../farmers/farmers.repository');
const { sendSuccess } = require('../../utils/response');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { z } = require('zod');

const chatInputSchema = z.object({
  message: z.string().min(1, 'संदेश रिक्त नहीं हो सकता').max(1000, 'संदेश 1000 अक्षरों से कम होना चाहिए'),
  farmerId: z.string().optional(),
  sessionId: z.string().optional(),
  lang: z.string().max(20).optional(),
  context: z.string().max(2500).optional()
});

// POST /api/v1/sarthi/chat
const chat = asyncHandler(async (req, res) => {
  const { message, farmerId, sessionId, lang, context } = chatInputSchema.parse(req.body);

  let farmer = req.user || {};
  if (!farmer.id && farmerId) {
    const fetched = await farmerRepo.findById(farmerId);
    if (fetched) farmer = fetched;
  }

  // RAG: retrieve verified knowledge before answering
  const rag = await learning.retrieveKnowledge({
    query: message,
    crop: farmer.primary_crop || context?.crop,
    state: farmer.state || context?.state,
    district: farmer.district || context?.district,
    limit: 5
  }).catch(() => []);

  const result = await sarthiService.processFarmerChat({
    message,
    farmer,
    sessionId,
    lang,
    context
  });

  // Log conversation for learning pipeline (async, non-blocking)
  learning.logConversation({
    farmer_id: farmer.id || farmerId || null,
    question: message,
    answer: result && (result.reply || result.answer || JSON.stringify(result)).slice(0, 4000),
    context: { crop: farmer.primary_crop, state: farmer.state, district: farmer.district, ...(context || {}) },
    sources: (rag || []).map(k => k.id)
  }).catch(() => {});

  return sendSuccess(res, result, 'उत्तर तैयार है');
});

module.exports = {
  chat
};
