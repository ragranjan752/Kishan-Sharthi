// ═══════════════════════════════════════════════════════════
//  Krishi Sarthi — Environment Configuration Validator
//  Validates required env vars at startup. Fails fast on missing.
// ═══════════════════════════════════════════════════════════

const requiredVars = {
  // Database
  SUPABASE_URL: { required: false, description: 'Supabase project URL' },
  SUPABASE_PUBLISHABLE_KEY: { required: false, description: 'Supabase publishable/anon key (frontend-safe)' },
  SUPABASE_SECRET_KEY: { required: false, description: 'Supabase secret/service role key (server-side only)' },
  SUPABASE_ANON_KEY: { required: false, description: 'Legacy alias for SUPABASE_PUBLISHABLE_KEY' },
  SUPABASE_SERVICE_ROLE_KEY: { required: false, description: 'Legacy alias for SUPABASE_SECRET_KEY' },

  // JWT
  JWT_SECRET: { required: true, minLength: 32, description: 'JWT signing secret (min 32 chars)' },
  JWT_EXPIRES_IN: { required: false, description: 'JWT expiry (default: 7d)' },

  // Server
  PORT: { required: false, description: 'Server port (only 3001 is supported)' },
  NODE_ENV: { required: false, description: 'Environment: development|production|test' },
};

const warnings = [];
const errors = [];

function validateEnv() {
  for (const [key, config] of Object.entries(requiredVars)) {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required env var: ${key} (${config.description})`);
      continue;
    }

    if (value && config.minLength && value.length < config.minLength) {
      errors.push(`${key} must be at least ${config.minLength} characters (${config.description})`);
    }

    if (!value && !config.required) {
      warnings.push(`Optional env var not set: ${key} — ${config.description}`);
    }
  }

  // Security checks
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    const weakSecrets = [
      'kisan-sarthi-secret-2026',
      'krishi-sarthi-bihar-secret-2026',
      'secret',
      'jwt_secret',
      'your_jwt_secret_key',
      'changeme',
    ];
    if (weakSecrets.includes(jwtSecret)) {
      errors.push('JWT_SECRET is a known weak/default value. Set a strong random secret of at least 64 characters.');
    }
  }

  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseSecret && supabaseSecret.includes('your_')) {
    warnings.push('Supabase secret key is set to an example value — privileged Supabase operations will not connect');
  }
  const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (process.env.SUPABASE_URL && !supabasePublishable) {
    warnings.push('SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY is not set — user-scoped Supabase client will be disabled');
  }
  if (supabasePublishable && supabasePublishable.startsWith('sb_secret_')) {
    warnings.push('SUPABASE_PUBLISHABLE_KEY appears to contain a secret key — user-scoped client will be disabled');
  }
  if (supabaseSecret && supabaseSecret.startsWith('sb_publishable_')) {
    warnings.push('SUPABASE_SECRET_KEY appears to contain a publishable key — privileged Supabase operations may fail');
  }

  return { errors, warnings };
}

function assertEnv() {
  const { errors, warnings } = validateEnv();

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Config warnings:');
    warnings.forEach((w) => console.warn(`   ${w}`));
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors — cannot start server:');
    errors.forEach((e) => console.error(`   • ${e}`));
    process.exit(1);
  }
}

module.exports = { validateEnv, assertEnv };

