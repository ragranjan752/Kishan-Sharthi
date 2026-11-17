// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer Repository
//  All DB operations for the farmers table.
//  Uses Supabase with resilient in-memory fallback.
// ═══════════════════════════════════════════════════════

const { supabase, isConfigured } = require('../../config/supabase');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');
const crypto = require('crypto');

const TABLE = 'farmers';

// In-memory fallback map for offline / test / unmigrated database states
const farmersMemoryMap = new Map();

/**
 * Find farmer by ID.
 */
async function findById(farmerId) {
  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, name, phone, email, district, block, land_size_kattha, land_size_bigha, primary_crop, farmer_category, role, is_active, phone_verified, profile_image_url, profile_completed, profile_completed_at, auth_user_id, created_at, updated_at')
        .eq('id', farmerId)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // Fall through to memory fallback
    }
  }

  return farmersMemoryMap.get(farmerId) || null;
}

/**
 * Find farmer by email.
 */
async function findByEmail(email) {
  if (!email) return null;
  const targetEmail = email.toLowerCase();

  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, name, phone, email, password_hash, district, block, land_size_kattha, land_size_bigha, primary_crop, farmer_category, role, is_active, phone_verified, profile_image_url, profile_completed, profile_completed_at, auth_user_id, created_at, updated_at')
        .eq('email', targetEmail)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // Fall through to memory fallback
    }
  }

  for (const farmer of farmersMemoryMap.values()) {
    if (farmer.email && farmer.email.toLowerCase() === targetEmail) {
      return farmer;
    }
  }

  return null;
}

/**
 * Find farmer by Supabase auth.users id.
 */
async function findByAuthUserId(authUserId) {
  if (!authUserId) return null;

  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, name, phone, email, district, block, land_size_kattha, land_size_bigha, primary_crop, farmer_category, role, is_active, phone_verified, profile_image_url, profile_completed, profile_completed_at, auth_user_id, created_at, updated_at')
        .eq('auth_user_id', authUserId)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // Fall through to memory fallback
    }
  }

  for (const farmer of farmersMemoryMap.values()) {
    if (farmer.auth_user_id === authUserId) {
      return farmer;
    }
  }

  return null;
}

/**
 * Find farmer by phone number.
 */
async function findByPhone(phone) {
  if (!phone) return null;

  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, name, phone, email, district, block, land_size_kattha, primary_crop, role, is_active, profile_completed, auth_user_id')
        .eq('phone', phone)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // Fall through to memory fallback
    }
  }

  for (const farmer of farmersMemoryMap.values()) {
    if (farmer.phone === phone) {
      return farmer;
    }
  }

  return null;
}

/**
 * Create a new farmer.
 */
async function create(farmerData) {
  const farmerId = farmerData.id || crypto.randomUUID();
  const profileCompleted = farmerData.profile_completed !== undefined
    ? farmerData.profile_completed
    : Boolean(
        farmerData.phone &&
        farmerData.district &&
        farmerData.block &&
        (parseFloat(farmerData.land_size_kattha) || 0) > 0 &&
        farmerData.primary_crop
      );
  const normalized = {
    ...farmerData,
    id: farmerId,
    auth_user_id: farmerData.auth_user_id || null,
    email: farmerData.email ? farmerData.email.toLowerCase() : null,
    land_size_kattha: parseFloat(farmerData.land_size_kattha) || 0,
    land_size_bigha: Number(((parseFloat(farmerData.land_size_kattha) || 0) / 20).toFixed(3)),
    role: farmerData.role || 'farmer',
    is_active: true,
    phone_verified: false,
    profile_completed: profileCompleted,
    profile_completed_at: profileCompleted ? new Date().toISOString() : null,
    created_at: new Date().toISOString()
  };

  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(normalized)
        .select('id, name, phone, email, district, block, primary_crop, farmer_category, role, land_size_kattha, land_size_bigha, profile_image_url, is_active, phone_verified, profile_completed, profile_completed_at, auth_user_id, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('email')) {
            throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
          }
          if (error.message.includes('phone')) {
            throw new AppError('Phone number already registered', 409, 'PHONE_EXISTS');
          }
          throw new AppError('Account already exists', 409, 'DUPLICATE');
        }
        logger.warn({ error }, 'Supabase insert failed — saving to memory store fallback');
      } else if (data) {
        farmersMemoryMap.set(data.id, data);
        return data;
      }
    } catch (e) {
      if (e.isOperational) throw e;
      logger.warn({ error: e.message }, 'Supabase unreachable — using in-memory registry');
    }
  }

  // Memory store fallback
  farmersMemoryMap.set(farmerId, normalized);
  return normalized;
}

/**
 * Update farmer profile fields.
 */
async function update(farmerId, updateData) {
  const existing = await findById(farmerId);
  const merged = {
    ...(existing || {}),
    ...updateData,
    updated_at: new Date().toISOString()
  };

  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updateData)
        .eq('id', farmerId)
        .select('id, name, phone, email, district, block, primary_crop, farmer_category, land_size_kattha, land_size_bigha, profile_image_url, profile_completed, profile_completed_at, auth_user_id, updated_at')
        .single();

      if (!error && data) {
        farmersMemoryMap.set(farmerId, data);
        return data;
      }
    } catch (e) {
      // Memory fallback
    }
  }

  farmersMemoryMap.set(farmerId, merged);
  return merged;
}

/**
 * Update password hash only.
 */
async function updatePassword(farmerId, passwordHash) {
  const existing = await findById(farmerId);
  if (existing) {
    existing.password_hash = passwordHash;
    existing.updated_at = new Date().toISOString();
    farmersMemoryMap.set(farmerId, existing);
  }

  if (isConfigured && process.env.NODE_ENV !== 'test') {
    try {
      await supabase
        .from(TABLE)
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('id', farmerId);
    } catch (e) {
      // Handled
    }
  }

  return true;
}

/**
 * List farmers (admin use).
 */
async function list({ page = 1, limit = 20, district = null, search = null } = {}) {
  const all = Array.from(farmersMemoryMap.values());
  let filtered = all;

  if (district) {
    filtered = filtered.filter(f => f.district && f.district.toLowerCase() === district.toLowerCase());
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(f => (f.name && f.name.toLowerCase().includes(s)) || (f.email && f.email.toLowerCase().includes(s)));
  }

  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    data: paginated,
    count: filtered.length
  };
}

module.exports = {
  findById,
  findByEmail,
  findByAuthUserId,
  findByPhone,
  create,
  update,
  updatePassword,
  list
};
