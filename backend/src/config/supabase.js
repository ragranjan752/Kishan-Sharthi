// ═══════════════════════════════════════════════
//  Krishi Sarthi — Supabase Client (Refined)
//  Publishable/anon key for user-context operations and
//  Secret/service key ONLY for server-side admin ops.
// ═══════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

// Guard against placeholder values from .env
const isPlaceholder = (val) =>
  !val || val.includes('your_') || val.includes('xxxx');

const urlOk = !isPlaceholder(SUPABASE_URL);
const secretKeyOk = !isPlaceholder(SUPABASE_SECRET_KEY);
const publishableKeyOk = !isPlaceholder(SUPABASE_PUBLISHABLE_KEY);

let supabase = null;      // admin client (secret key) — bypasses RLS; use sparingly
let supabaseAnon = null;  // publishable/anon client — respects RLS
let isConfigured = false;

if (urlOk && secretKeyOk) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'x-application-name': 'krishi-sarthi-server' },
    },
  });
  isConfigured = true;
  console.log('✅ Supabase admin client initialized');
} else {
  console.log('⚠️  Supabase admin not configured — running in offline/demo mode');
  if (!urlOk) console.log('   → Set SUPABASE_URL in .env');
  if (!secretKeyOk) console.log('   → Set SUPABASE_SECRET_KEY in .env');
}

if (urlOk && publishableKeyOk) {
  supabaseAnon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('✅ Supabase publishable/anon client initialized');
} else if (urlOk) {
  console.warn('⚠️  SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY not set — user-scoped Supabase client disabled. Secret key is not used as a fallback.');
}

/**
 * Returns a Supabase client scoped to the authenticated user's JWT.
 * This ensures RLS policies are applied correctly.
 * @param {string} userJwt - The user's Supabase JWT token
 */
function getUserClient(userJwt) {
  if (!userJwt || !urlOk || !publishableKeyOk) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${userJwt}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

module.exports = { supabase, supabaseAnon, getUserClient, isConfigured };
