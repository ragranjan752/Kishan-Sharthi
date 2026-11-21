const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { sendSuccess } = require('../../utils/response');
const { authenticate, requireRole } = require('../../middleware/auth');
const learning = require('./learning.service');

// Public-ish feedback endpoints (optional auth handled inside service)
router.post('/feedback', asyncHandler(async (req, res) => {
  const { module, ref_id, rating, comment } = req.body || {};
  if (!module || !ref_id || !rating) return sendSuccess(res, null, 'Missing fields');
  const fb = await learning.submitFeedback({ module, ref_id, farmer_id: req.user?.id || req.userId, rating, comment });
  return sendSuccess(res, fb, 'Feedback recorded');
}));

// Disease diagnosis feedback
router.post('/disease-feedback', authenticate, asyncHandler(async (req, res) => {
  const { detection_id, rating } = req.body || {};
  if (!detection_id || !rating) return sendSuccess(res, null, 'Missing fields');
  const fb = await learning.submitDiseaseFeedback({ detection_id, rating, farmer_id: req.userId });
  return sendSuccess(res, fb, 'Feedback recorded');
}));

// Farmer context (opt-in personalization)
router.get('/context', authenticate, asyncHandler(async (req, res) => {
  const ctx = await learning.getFarmerContext(req.userId);
  return sendSuccess(res, ctx, 'Farmer context');
}));
router.put('/context', authenticate, asyncHandler(async (req, res) => {
  const ctx = await learning.saveFarmerContext(req.userId, req.body || {});
  return sendSuccess(res, ctx, 'Context saved');
}));

// Admin / expert review endpoints
router.get('/admin/insights', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const insights = await learning.getInsights();
  return sendSuccess(res, insights, 'Learning insights');
}));

router.post('/admin/knowledge/:id/review', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { decision, notes } = req.body || {};
  const k = await learning.reviewKnowledge(req.params.id, { decision, reviewer_id: req.userId, notes });
  return sendSuccess(res, k, 'Knowledge reviewed');
}));

router.post('/admin/candidate/:id/review', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { decision } = req.body || {};
  const c = await learning.reviewCandidate(req.params.id, { decision, reviewer_id: req.userId });
  return sendSuccess(res, c, 'Candidate reviewed');
}));

module.exports = router;
