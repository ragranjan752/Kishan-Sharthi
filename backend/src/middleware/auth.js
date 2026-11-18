// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Authentication Middleware (Phase 4)
//  Verifies JWT, loads farmer profile, enforces roles.
// ═══════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { supabase, isConfigured } = require('../config/supabase');
const farmerRepo = require('../modules/farmers/farmers.repository');
const logger = require('../config/logger');
const { isDemoModeEnabled, demoProfile, isDemoTokenPayload } = require('../config/demo');

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory user cache: reduces DB round-trips
// Cache entries expire after 5 minutes
const userCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getUserFromCache(userId) {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    userCache.delete(userId);
    return null;
  }
  return entry.user;
}

function setUserInCache(userId, user) {
  userCache.set(userId, { user, ts: Date.now() });
}

async function verifySupabaseAccessToken(token) {
  if (!isConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

async function findFarmerForSupabaseUser(authUser) {
  let farmer = await farmerRepo.findByAuthUserId(authUser.id);

  if (!farmer && authUser.email) {
    farmer = await farmerRepo.findByEmail(authUser.email);
  }

  if (!farmer) return null;

  if (farmer.auth_user_id && farmer.auth_user_id !== authUser.id) {
    return null;
  }

  if (!farmer.auth_user_id) {
    farmer = await farmerRepo.update(farmer.id, { auth_user_id: authUser.id });
  }

  return farmer;
}

async function authenticateSupabase(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.slice(7);
    const authUser = await verifySupabaseAccessToken(token);
    if (!authUser) {
      throw new AppError('Invalid Supabase access token', 401, 'INVALID_TOKEN');
    }

    const farmer = await findFarmerForSupabaseUser(authUser);
    req.authUser = authUser;
    req.authUserId = authUser.id;
    req.authEmail = authUser.email || null;

    if (farmer) {
      if (farmer.is_active === false) {
        throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
      }
      setUserInCache(farmer.id, farmer);
      req.user = farmer;
      req.userId = farmer.id;
    } else {
      req.user = null;
      req.userId = null;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: require a valid JWT Bearer token.
 * Populates req.user with the full farmer profile.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new AppError('Token expired — please log in again', 401, 'TOKEN_EXPIRED');
      }

      const supabaseUser = await verifySupabaseAccessToken(token);
      if (!supabaseUser) {
        throw new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
      }

      const farmer = await findFarmerForSupabaseUser(supabaseUser);
      if (!farmer) {
        throw new AppError('Farmer profile not found for this account', 401, 'FARMER_PROFILE_REQUIRED');
      }
      if (farmer.is_active === false) {
        throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
      }

      setUserInCache(farmer.id, farmer);
      req.user = farmer;
      req.userId = farmer.id;
      return next();
    }

    if (!decoded.id) {
      throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
    }

    if (decoded.demo === true) {
      if (!isDemoModeEnabled() || !isDemoTokenPayload(decoded)) {
        throw new AppError('Invalid demo token', 401, 'INVALID_TOKEN');
      }
      req.user = demoProfile();
      req.userId = req.user.id;
      req.isDemo = true;
      return next();
    }

    // Check cache first
    let user = getUserFromCache(decoded.id);

    if (!user) {
      if (!isConfigured) {
        // Demo mode: build minimal user object from token
        user = { id: decoded.id, role: decoded.role || 'farmer', district: decoded.district };
      } else {
        const { data, error } = await supabase
          .from('farmers')
          .select('id, name, phone, email, district, block, land_size_kattha, primary_crop, role, is_active, state, state_code, district_code, subdistrict_code, village_code')
          .eq('id', decoded.id)
          .single();

        if (error || !data) {
          throw new AppError('User account not found', 401, 'USER_NOT_FOUND');
        }

        if (data.is_active === false) {
          throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
        }

        user = data;
        setUserInCache(decoded.id, user);
      }
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: attach user if token present, but do NOT require it.
 * Useful for endpoints that return different data for logged-in users.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.demo === true) {
      if (isDemoModeEnabled() && isDemoTokenPayload(decoded)) {
        req.user = demoProfile();
        req.userId = req.user.id;
        req.isDemo = true;
      }
      return next();
    }

    let user = getUserFromCache(decoded.id);
    if (!user && isConfigured) {
      const { data } = await supabase
        .from('farmers')
        .select('id, name, phone, email, district, block, primary_crop, role, is_active, state')
        .eq('id', decoded.id)
        .single();
      if (data && data.is_active !== false) {
        user = data;
        setUserInCache(decoded.id, user);
      }
    } else if (!user) {
      user = { id: decoded.id, role: decoded.role || 'farmer' };
    }

    if (user) {
      req.user = user;
      req.userId = user.id;
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
}

/**
 * Role-based access control factory.
 * Usage: router.delete('/schemes/:id', authenticate, requireRole('admin'), handler)
 *
 * Roles: 'farmer' | 'admin' | 'department_official' | 'agronomist'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const userRole = req.user.role || 'farmer';
    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        { userId: req.user.id, userRole, requiredRoles: allowedRoles, path: req.path },
        'Access denied — insufficient role'
      );
      return next(new AppError('Access denied — insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}

/**
 * Invalidate cache entry for a user (call after profile updates).
 */
function invalidateUserCache(userId) {
  userCache.delete(userId);
}

module.exports = { authenticate, authenticateSupabase, optionalAuth, requireRole, invalidateUserCache };

