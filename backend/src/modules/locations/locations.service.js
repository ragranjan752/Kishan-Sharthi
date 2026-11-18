// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Pan-India Geography Service (LGD data)
//  Reads geo_states / geo_districts / geo_subdistricts / geo_villages.
//  Small tables are cached in memory; villages are queried per
//  sub-district with optional text search (table has ~662k rows).
// ═══════════════════════════════════════════════════════════════════

const { supabase, isConfigured } = require('../../config/supabase');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');

const CACHE_TTL_MS = 10 * 60 * 1000; // geo data is static — refresh every 10 min
const cache = new Map(); // key -> { data, ts }

function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return Promise.resolve(hit.data);
  return loader().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

function requireDb() {
  if (!isConfigured) {
    throw new AppError('Location service unavailable', 503, 'GEO_UNAVAILABLE');
  }
}

// ── States & UTs (36 rows — fully cached) ──
async function listStates() {
  requireDb();
  return cached('states', async () => {
    const { data, error } = await supabase
      .from('geo_states')
      .select('state_code, name, is_ut')
      .order('name');
    if (error) throw new AppError('Failed to load states', 500, 'GEO_ERROR');
    return data;
  });
}

// ── Districts for a state (~5-75 rows) ──
async function listDistricts(stateCode) {
  requireDb();
  const code = parseInt(stateCode, 10);
  if (!Number.isFinite(code)) {
    throw new AppError('Valid state code required', 400, 'INVALID_STATE_CODE');
  }
  return cached(`districts:${code}`, async () => {
    const { data, error } = await supabase
      .from('geo_districts')
      .select('district_code, name')
      .eq('state_code', code)
      .order('name');
    if (error) throw new AppError('Failed to load districts', 500, 'GEO_ERROR');
    return data;
  });
}

// ── Subdistricts (tehsil / taluk / mandal / block) for a district ──
async function listSubdistricts(districtCode) {
  requireDb();
  const code = parseInt(districtCode, 10);
  if (!Number.isFinite(code)) {
    throw new AppError('Valid district code required', 400, 'INVALID_DISTRICT_CODE');
  }
  return cached(`subdistricts:${code}`, async () => {
    const { data, error } = await supabase
      .from('geo_subdistricts')
      .select('subdistrict_code, name')
      .eq('district_code', code)
      .order('name');
    if (error) throw new AppError('Failed to load sub-districts', 500, 'GEO_ERROR');
    return data;
  });
}

// ── Villages for a subdistrict — search + capped results ──
async function searchVillages(subdistrictCode, query = '', limit = 50) {
  requireDb();
  const code = parseInt(subdistrictCode, 10);
  if (!Number.isFinite(code)) {
    throw new AppError('Valid sub-district code required', 400, 'INVALID_SUBDISTRICT_CODE');
  }
  const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const q = (query || '').trim();

  let req = supabase
    .from('geo_villages')
    .select('village_code, name, local_name, status')
    .eq('subdistrict_code', code)
    .order('name')
    .limit(cap);

  if (q.length >= 2) {
    // Escape ilike wildcards, match name or local name
    const safe = q.replace(/[%_\\]/g, ch => '\\' + ch);
    req = req.or(`name.ilike.%${safe}%,local_name.ilike.%${safe}%`);
  }

  const { data, error } = await req;
  if (error) {
    logger.warn({ error: error.message }, 'Village search failed');
    throw new AppError('Failed to load villages', 500, 'GEO_ERROR');
  }
  return data || [];
}

// ── Resolve geo codes → display names (used by registration) ──
async function resolveGeo({ state_code, district_code, subdistrict_code, village_code, village }) {
  requireDb();
  const out = { state: null, district: null, block: null, village: village || null };

  const lookups = [
    [state_code, 'geo_states', 'state_code', 'state'],
    [district_code, 'geo_districts', 'district_code', 'district'],
    [subdistrict_code, 'geo_subdistricts', 'subdistrict_code', 'block'],
    [village_code, 'geo_villages', 'village_code', 'village'],
  ];

  await Promise.all(lookups.map(async ([code, table, col, field]) => {
    if (code == null) return;
    const { data } = await supabase.from(table).select('name').eq(col, code).maybeSingle();
    if (data && data.name) out[field] = data.name;
  }));

  return out;
}

module.exports = { listStates, listDistricts, listSubdistricts, searchVillages, resolveGeo };
