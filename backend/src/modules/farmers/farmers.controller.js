// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer Controller (Phase 3 Refactor)
//  Thin controller: validate → service → respond.
// ═══════════════════════════════════════════════════════

const farmerService = require('./farmers.service');
const farmerRepo = require('./farmers.repository');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { parsePagination } = require('../../utils/pagination');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
  updateProfileSchema,
} = require('./farmers.validator');
const logger = require('../../config/logger');

// Email service (optional — only send if configured)
let emailService = null;
try {
  emailService = require('../../utils/email');
} catch {
  // Email service not configured — reset codes will only appear in server logs
}

function sendAuthResponse(res, result, message, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    user: result.farmer,
    token: result.token,
    data: result,
  });
}

// ════════════════════════════════════
//  POST /api/v1/auth/register
// ════════════════════════════════════
const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await farmerService.register(data);

  return sendAuthResponse(res, result, 'किसान पंजीकरण सफल (Registration successful)', 201);
});

// ════════════════════════════════════
//  POST /api/v1/auth/login
// ════════════════════════════════════
const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await farmerService.login(email, password);

  return sendAuthResponse(res, result, 'Login successful');
});

const socialLogin = (provider) => asyncHandler(async (req, res) => {
  const { idToken, email, displayName, photoURL } = req.body || {};
  const result = await farmerService.loginWithFirebase(provider, idToken, { email, displayName, photoURL });

  return sendAuthResponse(res, result, 'Login successful');
});

// ════════════════════════════════════
//  GET /api/v1/auth/me
// ════════════════════════════════════
const getMe = asyncHandler(async (req, res) => {
  if (req.isDemo && req.user) {
    return sendSuccess(res, { farmer: req.user });
  }
  const farmer = await farmerService.getProfile(req.userId);
  return sendSuccess(res, { farmer });
});

// ════════════════════════════════════
//  POST /api/v1/auth/forgot-password
// ════════════════════════════════════
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const result = await farmerService.forgotPassword(email);

  if (result.sent && emailService) {
    // Send code via email — do NOT include code in API response
    await emailService.sendPasswordReset(email, result.rawCode, result.farmerName);
    logger.info({ farmerId: result.farmerId }, 'Password reset email dispatched');
  } else if (result.sent) {
    // Email service not configured: log code server-side only (never in response)
    logger.info(
      { farmerId: result.farmerId },
      'Email service not configured — reset code logged server-side only'
    );
  }

  // Always return the same message (prevents email enumeration)
  return sendSuccess(
    res,
    null,
    'If that email is registered, a password reset code has been sent'
  );
});

// ════════════════════════════════════
//  POST /api/v1/auth/reset-password
// ════════════════════════════════════
const resetPassword = asyncHandler(async (req, res) => {
  const { email, reset_code, new_password } = resetPasswordSchema.parse(req.body);
  await farmerService.resetPassword(email, reset_code, new_password);

  return sendSuccess(res, null, 'Password reset successful. Please log in with your new password.');
});

// ════════════════════════════════════
//  GET /api/v1/farmers/:farmerId
// ════════════════════════════════════
const getProfile = asyncHandler(async (req, res) => {
  const { farmerId } = req.params;

  // Farmers can only view their own profile; admins can view any
  if (req.user.role !== 'admin' && req.userId !== farmerId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const farmer = await farmerService.getProfile(farmerId);
  return sendSuccess(res, { farmer });
});

// ════════════════════════════════════
//  PUT /api/v1/farmers/:farmerId
// ════════════════════════════════════
const updateProfile = asyncHandler(async (req, res) => {
  const { farmerId } = req.params;

  if (req.user.role !== 'admin' && req.userId !== farmerId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const data = updateProfileSchema.parse(req.body);
  const farmer = await farmerService.updateProfile(farmerId, data);

  return sendSuccess(res, { farmer }, 'Profile updated successfully');
});

// ════════════════════════════════════
//  PUT /api/v1/farmers/me/complete-profile
// ════════════════════════════════════
const completeProfile = asyncHandler(async (req, res) => {
  const data = completeProfileSchema.parse(req.body);
  const farmer = await farmerService.completeProfile(req.userId, data);

  return sendSuccess(res, { farmer }, 'Profile completed successfully');
});

// ════════════════════════════════════
//  POST /api/v1/farmers/bootstrap
// ════════════════════════════════════
const bootstrapProfile = asyncHandler(async (req, res) => {
  const farmer = await farmerService.bootstrapProfile(req.authUser, req.user);
  return sendSuccess(res, { farmer }, 'Farmer profile ready');
});

// ════════════════════════════════════
//  GET /api/v1/farmers/phone/:phone
// ════════════════════════════════════
const getByPhone = asyncHandler(async (req, res) => {
  const role = req.user && req.user.role;
  const isSelf = req.user && req.user.phone === req.params.phone;
  if (role !== 'admin' && !isSelf) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  const farmer = await farmerRepo.findByPhone(req.params.phone);
  if (!farmer) {
    throw new AppError('Farmer not found', 404, 'NOT_FOUND');
  }
  return sendSuccess(res, { farmer });
});

// ════════════════════════════════════
//  GET /api/v1/admin/farmers  (admin only)
// ════════════════════════════════════
const listFarmers = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { district, search } = req.query;

  const { data, count } = await farmerRepo.list({ page, limit, district, search });
  return sendPaginated(res, data, count, page, limit, 'Farmers retrieved');
});

module.exports = {
  register,
  login,
  googleLogin: socialLogin('google'),
  getMe,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  completeProfile,
  bootstrapProfile,
  getByPhone,
  listFarmers,
};

