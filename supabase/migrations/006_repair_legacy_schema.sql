-- ═══════════════════════════════════════════════════════════════════
--  KRISHI SARTHI — Migration 006: Repair Legacy Schema
--  The live database predates migrations 001-004. Existing `farmers`
--  rows are preserved; stale `schemes`/`crops` tables are rebuilt.
--  SAFE TO RUN: all statements are idempotent (IF NOT EXISTS / CASCADE).
--  DO NOT run 005_remove_legacy_password_hash.sql (legacy login still used).
-- ═══════════════════════════════════════════════════════════════════

-- 1. Patch existing farmers table with columns added after it was created
ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'farmer',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS farmer_category VARCHAR(50) DEFAULT 'small',
  ADD COLUMN IF NOT EXISTS village VARCHAR(150),
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS supabase_auth_id UUID;

-- Backfill profile_completed for rows that already look complete
UPDATE public.farmers
SET profile_completed = true,
    profile_completed_at = COALESCE(updated_at, created_at, NOW())
WHERE profile_completed = false
  AND phone IS NOT NULL
  AND district IS NOT NULL
  AND district <> 'Not specified'
  AND block IS NOT NULL
  AND block <> 'Not specified'
  AND COALESCE(land_size_kattha, 0) > 0
  AND primary_crop IS NOT NULL;

-- 2. Drop stale reference tables so migration 001 can recreate them
--    (schemes falls back to built-in verified data; crops is re-seeded)
DROP TABLE IF EXISTS public.scheme_eligibility_rules CASCADE;
DROP TABLE IF EXISTS public.scheme_documents CASCADE;
DROP TABLE IF EXISTS public.scheme_applications CASCADE;
DROP TABLE IF EXISTS public.schemes CASCADE;
DROP TABLE IF EXISTS public.crops CASCADE;
