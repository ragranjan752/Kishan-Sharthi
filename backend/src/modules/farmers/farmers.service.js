// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer Service (Phase 4: Security Fix)
//  Business logic: auth, password hashing, JWT issuance.
//
//  SECURITY FIXES vs OLD CODE:
//  - bcrypt.compare() used for login (was plaintext comparison)
//  - bcrypt.hash() used for registration (was plaintext storage)
//  - Reset codes NOT returned in API response
//  - Reset code stored hashed in DB
//  - Tokens signed with configurable secret
// ═══════════════════════════════════════════════════════

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase, isConfigured } = require('../../config/supabase');
const { admin: firebaseAdmin, isConfigured: isFirebaseConfigured } = require('../../../config/firebase');
const farmerRepo = require('./farmers.repository');
const locationsService = require('../locations/locations.service');
const { BIHAR_DISTRICTS } = require('./farmers.validator');
const { AppError } = require('../../middleware/errorHandler');
const { invalidateUserCache } = require('../../middleware/auth');
const logger = require('../../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12; // 12 rounds: strong but manageable on low-end servers

// ════════════════════════════════════
//  REGISTER
// ════════════════════════════════════
async function register(validatedData) {
  const { password, ...profileData } = validatedData;

  // ── Resolve pan-India geography (LGD codes → canonical names) ──
  const hasGeoCodes = Boolean(profileData.state_code || profileData.district_code || profileData.subdistrict_code || profileData.village_code);
  if (hasGeoCodes && isConfigured) {
    const geo = await locationsService.resolveGeo({
      state_code: profileData.state_code,
      district_code: profileData.district_code,
      subdistrict_code: profileData.subdistrict_code,
      village_code: profileData.village_code,
      village: profileData.village,
    });
    // Codes must resolve — reject forged/invalid geography
    if (profileData.state_code && !geo.state) {
      throw new AppError('Invalid state selection', 400, 'INVALID_GEO');
    }
    if (profileData.district_code && !geo.district) {
      throw new AppError('Invalid district selection', 400, 'INVALID_GEO');
    }
    if (profileData.subdistrict_code && !geo.block) {
      throw new AppError('Invalid sub-district selection', 400, 'INVALID_GEO');
    }
    if (profileData.village_code && !geo.village) {
      throw new AppError('Invalid village selection', 400, 'INVALID_GEO');
    }
    profileData.state = geo.state || profileData.state || null;
    profileData.district = geo.district || profileData.district || null;
    profileData.block = geo.block || profileData.block || null;
    profileData.village = geo.village || profileData.village || null;
  }

  // ── Location requirement: need district (code-resolved or legacy name) ──
  if (!profileData.district_code && !profileData.district) {
    throw new AppError('District is required', 400, 'DISTRICT_REQUIRED');
  }
  // Legacy compatibility: name-only districts are still restricted to Bihar
  if (!profileData.district_code && profileData.district && !BIHAR_DISTRICTS.includes(profileData.district)) {
    throw new AppError('Please select your district from the location dropdown', 400, 'INVALID_DISTRICT');
  }
  profileData.district = profileData.district || 'Not specified';
  profileData.block = profileData.block || 'Not specified';

  // Agricultural fields are optional at signup (collected via complete-profile)
  profileData.land_size_kattha = profileData.land_size_kattha || 0;
  profileData.primary_crop = profileData.primary_crop || 'Dhan';

  // Check duplicates before hashing (saves time)
  const existingByEmail = await farmerRepo.findByEmail(profileData.email);
  if (existingByEmail) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  if (profileData.phone) {
    const existingByPhone = await farmerRepo.findByPhone(profileData.phone);
    if (existingByPhone) {
      throw new AppError('Phone number already registered', 409, 'PHONE_EXISTS');
    }
  }

  // Hash password with bcrypt (SECURITY FIX: was plaintext)
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const farmer = await farmerRepo.create({ ...profileData, password_hash });

  const token = issueToken(farmer);

  logger.info({ farmerId: farmer.id, district: farmer.district }, 'New farmer registered');

  return { farmer: sanitizeFarmer(farmer), token };
}

// ════════════════════════════════════
//  LOGIN
// ════════════════════════════════════
async function login(email, password) {
  const farmer = await farmerRepo.findByEmail(email);

  // Use same error for both "not found" and "wrong password"
  // (prevents user enumeration)
  if (!farmer) {
    // Perform a dummy bcrypt compare to prevent timing attacks
    await bcrypt.compare(password, '$2a$12$dummyhashtopreventtimingattacks1234567890');
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (farmer.is_active === false) {
    throw new AppError('Account is deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  // SECURITY FIX: use bcrypt.compare (was plaintext comparison)
  let passwordMatch = false;
  const storedSecret = farmer.password_hash || farmer.password;
  const isBcryptHash = typeof storedSecret === 'string' && /^\$2[aby]\$\d{2}\$/.test(storedSecret);

  if (storedSecret && isBcryptHash) {
    passwordMatch = await bcrypt.compare(password, storedSecret);
  } else if (storedSecret) {
    // Migration path: some old records may have plaintext passwords (from old server.js)
    // Compare plaintext and re-hash immediately
    passwordMatch = password === storedSecret;
    if (passwordMatch) {
      logger.warn({ farmerId: farmer.id }, 'Migrating plaintext password to bcrypt hash');
      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await farmerRepo.updatePassword(farmer.id, newHash);
    }
  }

  if (!passwordMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = issueToken(farmer);

  logger.info({ farmerId: farmer.id }, 'Farmer logged in');

  return { farmer: sanitizeFarmer(farmer), token };
}

// ════════════════════════════════════
//  SOCIAL LOGIN (Firebase ID token)
// ════════════════════════════════════
async function loginWithFirebase(provider, idToken, profile = {}) {
  if (!isFirebaseConfigured) {
    throw new AppError('Social sign-in is not configured', 503, 'SOCIAL_AUTH_UNAVAILABLE');
  }
  if (!idToken) {
    throw new AppError('Firebase ID token is required', 400, 'MISSING_ID_TOKEN');
  }

  let decoded;
  try {
    decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  } catch {
    throw new AppError('Invalid or expired sign-in token', 401, 'INVALID_ID_TOKEN');
  }

  const email = (decoded.email || '').toLowerCase();
  if (!email) {
    throw new AppError('Email is required to link a farmer profile', 400, 'EMAIL_REQUIRED');
  }

  let farmer = await farmerRepo.findByEmail(email);

  if (!farmer) {
    const unusablePasswordHash = await bcrypt.hash(crypto.randomUUID(), BCRYPT_ROUNDS);
    farmer = await farmerRepo.create({
      name: decoded.name || profile.displayName || profile.name || email.split('@')[0],
      email,
      password_hash: unusablePasswordHash,
      phone: null,
      district: 'Not specified',
      block: 'Not specified',
      land_size_kattha: 0,
      primary_crop: 'Dhan',
      profile_image_url: decoded.picture || profile.photoURL || null,
      role: 'farmer',
      is_active: true,
      profile_completed: false,
    });
    logger.info({ farmerId: farmer.id, provider }, 'Farmer profile created via social sign-in');
  }

  if (farmer.is_active === false) {
    throw new AppError('Account is deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  const token = issueToken(farmer);
  logger.info({ farmerId: farmer.id, provider }, 'Farmer logged in via social provider');

  return { farmer: sanitizeFarmer(farmer), token };
}

// ════════════════════════════════════
//  FORGOT PASSWORD
// ════════════════════════════════════
async function forgotPassword(email) {
  const farmer = await farmerRepo.findByEmail(email);

  // Always return success — prevents email enumeration
  if (!farmer) {
    logger.info({ email }, 'Password reset requested for non-existent email');
    return { sent: false };
  }

  // Generate a 6-digit code
  const rawCode = crypto.randomInt(100000, 999999).toString();

  // SECURITY FIX: store hashed code, not plaintext
  const codeHash = await bcrypt.hash(rawCode, 10);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  if (isConfigured) {
    // Delete any existing reset codes for this email
    await supabase
      .from('password_resets')
      .delete()
      .eq('farmer_id', farmer.id);

    // Store hashed code
    await supabase.from('password_resets').insert({
      farmer_id: farmer.id,
      email: email.toLowerCase(),
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
    });
  }

  logger.info({ farmerId: farmer.id }, 'Password reset code generated');

  // Return raw code ONLY for email sending — never expose in API response
  return { sent: true, farmerId: farmer.id, rawCode, farmerName: farmer.name };
}

// ════════════════════════════════════
//  RESET PASSWORD
// ════════════════════════════════════
async function resetPassword(email, resetCode, newPassword) {
  if (!isConfigured) {
    throw new AppError('Password reset unavailable in demo mode', 503, 'SERVICE_UNAVAILABLE');
  }

  // Find the reset record
  const { data: resetRecord, error } = await supabase
    .from('password_resets')
    .select('id, farmer_id, code_hash, expires_at')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !resetRecord) {
    throw new AppError('Invalid or expired reset code', 400, 'INVALID_RESET_CODE');
  }

  // Check expiry
  if (new Date(resetRecord.expires_at) < new Date()) {
    await supabase.from('password_resets').delete().eq('id', resetRecord.id);
    throw new AppError('Reset code has expired. Please request a new one.', 400, 'RESET_CODE_EXPIRED');
  }

  // SECURITY FIX: compare against hash
  const codeValid = await bcrypt.compare(resetCode, resetRecord.code_hash);
  if (!codeValid) {
    throw new AppError('Invalid or expired reset code', 400, 'INVALID_RESET_CODE');
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await farmerRepo.updatePassword(resetRecord.farmer_id, newHash);

  // Delete used reset code
  await supabase.from('password_resets').delete().eq('id', resetRecord.id);

  // Invalidate cached user
  invalidateUserCache(resetRecord.farmer_id);

  logger.info({ farmerId: resetRecord.farmer_id }, 'Password reset successfully');

  return true;
}

// ════════════════════════════════════
//  GET PROFILE
// ════════════════════════════════════
async function getProfile(farmerId) {
  const farmer = await farmerRepo.findById(farmerId);
  if (!farmer) {
    throw new AppError('Farmer profile not found', 404, 'FARMER_NOT_FOUND');
  }
  return sanitizeFarmer(farmer);
}

// ════════════════════════════════════
//  UPDATE PROFILE
// ════════════════════════════════════
async function updateProfile(farmerId, updateData) {
  // Resolve pan-India geography codes → canonical names
  const hasGeo = updateData.state_code || updateData.district_code || updateData.subdistrict_code || updateData.village_code;
  if (hasGeo && isConfigured) {
    const geo = await locationsService.resolveGeo({
      state_code: updateData.state_code,
      district_code: updateData.district_code,
      subdistrict_code: updateData.subdistrict_code,
      village_code: updateData.village_code,
    });
    if (updateData.state_code && !geo.state) throw new AppError('Invalid state selection', 400, 'INVALID_GEO');
    if (updateData.district_code && !geo.district) throw new AppError('Invalid district selection', 400, 'INVALID_GEO');
    if (updateData.subdistrict_code && !geo.block) throw new AppError('Invalid sub-district selection', 400, 'INVALID_GEO');
    updateData.state = geo.state || updateData.state || null;
    updateData.district = geo.district || updateData.district;
    updateData.block = geo.block || updateData.subdistrict || updateData.block;
    updateData.subdistrict = geo.block || updateData.subdistrict || updateData.block;
    updateData.village = geo.village || updateData.village || null;
  }
  const updated = await farmerRepo.update(farmerId, updateData);
  invalidateUserCache(farmerId);
  logger.info({ farmerId }, 'Farmer profile updated');
  return sanitizeFarmer(updated);
}

// ════════════════════════════════════
//  SUPABASE PROFILE BOOTSTRAP
// ════════════════════════════════════
async function bootstrapProfile(authUser, existingFarmer = null) {
  if (existingFarmer) {
    return sanitizeFarmer(existingFarmer);
  }

  const email = (authUser.email || '').toLowerCase();
  if (!email) {
    throw new AppError('Email is required to create a farmer profile', 400, 'EMAIL_REQUIRED');
  }

  let farmer = await farmerRepo.findByAuthUserId(authUser.id);
  if (!farmer) {
    farmer = await farmerRepo.findByEmail(email);
  }
  if (farmer) {
    if (!farmer.auth_user_id) {
      farmer = await farmerRepo.update(farmer.id, { auth_user_id: authUser.id });
    }
    return sanitizeFarmer(farmer);
  }

  const meta = authUser.user_metadata || {};
  const name = meta.name || meta.full_name || meta.displayName || email.split('@')[0];
  let phone = meta.phone || null;
  if (phone && !/^[6-9]\d{9}$/.test(phone)) phone = null;
  if (phone) {
    const duplicatePhone = await farmerRepo.findByPhone(phone);
    if (duplicatePhone) phone = null;
  }

  // ── Pan-India geo fields from signup metadata (LGD codes) ──
  const metaStateCode = parseInt(meta.state_code, 10) || null;
  const metaDistrictCode = parseInt(meta.district_code, 10) || null;
  const metaSubdistrictCode = parseInt(meta.subdistrict_code, 10) || null;
  const metaVillageCode = parseInt(meta.village_code, 10) || null;
  let geoNames = { state: null, district: null, block: null, village: null };
  if (isConfigured && (metaStateCode || metaDistrictCode || metaSubdistrictCode || metaVillageCode)) {
    try {
      geoNames = await locationsService.resolveGeo({
        state_code: metaStateCode,
        district_code: metaDistrictCode,
        subdistrict_code: metaSubdistrictCode,
        village_code: metaVillageCode,
        village: meta.village || null,
      });
    } catch { /* geo resolution is best-effort at bootstrap */ }
  }

  const district = geoNames.district || meta.district || 'Not specified';
  const block = geoNames.block || meta.block || 'Not specified';
  const landKattha = parseFloat(meta.land_size_kattha) || 0;
  const primaryCrop = meta.primary_crop || 'Dhan';
  const profileCompleted = Boolean(
    phone &&
    district !== 'Not specified' &&
    block !== 'Not specified' &&
    landKattha > 0 &&
    primaryCrop
  );

  farmer = await farmerRepo.create({
    id: authUser.id,
    auth_user_id: authUser.id,
    name,
    email,
    phone,
    district,
    block,
    village: geoNames.village || meta.village || null,
    state: geoNames.state || meta.state || null,
    state_code: metaStateCode,
    district_code: metaDistrictCode,
    subdistrict_code: metaSubdistrictCode,
    village_code: metaVillageCode,
    land_size_kattha: landKattha,
    primary_crop: primaryCrop,
    profile_image_url: meta.avatar_url || meta.picture || null,
    password_hash: await bcrypt.hash(crypto.randomUUID(), BCRYPT_ROUNDS),
    role: 'farmer',
    is_active: true,
    profile_completed: profileCompleted,
  });

  logger.info({ farmerId: farmer.id, authUserId: authUser.id }, 'Farmer profile bootstrapped from Supabase Auth');
  return sanitizeFarmer(farmer);
}

// ════════════════════════════════════
//  COMPLETE PROFILE
// ════════════════════════════════════
async function completeProfile(farmerId, data) {
  const existingPhone = await farmerRepo.findByPhone(data.phone);
  if (existingPhone && existingPhone.id !== farmerId) {
    throw new AppError('Phone number already registered', 409, 'PHONE_EXISTS');
  }

  // ── Resolve pan-India geography (LGD codes → canonical names) ──
  const hasGeoCodes = Boolean(data.state_code || data.district_code || data.subdistrict_code);
  if (hasGeoCodes && isConfigured) {
    const geo = await locationsService.resolveGeo({
      state_code: data.state_code,
      district_code: data.district_code,
      subdistrict_code: data.subdistrict_code,
    });
    if (data.state_code && !geo.state) throw new AppError('Invalid state selection', 400, 'INVALID_GEO');
    if (data.district_code && !geo.district) throw new AppError('Invalid district selection', 400, 'INVALID_GEO');
    if (data.subdistrict_code && !geo.block) throw new AppError('Invalid sub-district selection', 400, 'INVALID_GEO');
    data.state = geo.state || data.state || null;
    data.district = geo.district || data.district;
    data.block = geo.block || data.block;
  }

  const updated = await farmerRepo.update(farmerId, {
    name: data.name,
    phone: data.phone,
    state: data.state || null,
    state_code: data.state_code || null,
    district_code: data.district_code || null,
    subdistrict_code: data.subdistrict_code || null,
    district: data.district,
    block: data.block,
    land_size_kattha: data.land_size_kattha,
    primary_crop: data.primary_crop,
    profile_completed: true,
    profile_completed_at: new Date().toISOString(),
  });

  invalidateUserCache(farmerId);
  logger.info({ farmerId }, 'Farmer profile completed');

  return sanitizeFarmer(updated);
}

// ════════════════════════════════════
//  HELPERS
// ════════════════════════════════════
function issueToken(farmer) {
  return jwt.sign(
    {
      id: farmer.id,
      district: farmer.district,
      role: farmer.role || 'farmer',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** Remove sensitive fields before sending to client. */
function sanitizeFarmer(farmer) {
  const { password_hash, password, ...safe } = farmer;
  return safe;
}

module.exports = { register, login, loginWithFirebase, forgotPassword, resetPassword, getProfile, updateProfile, completeProfile, bootstrapProfile };

