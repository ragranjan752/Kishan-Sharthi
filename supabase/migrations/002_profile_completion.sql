-- ═══════════════════════════════════════════════════════════════════
--  KRISHI SARTHI — Migration 002: Mandatory Farmer Profile Completion
--  Adds profile completion tracking without overwriting farmer data.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill only records that already look complete (real district/block,
-- positive land, and a mobile number). Social/default placeholders stay false.
UPDATE farmers
SET
  profile_completed = true,
  profile_completed_at = COALESCE(updated_at, created_at, NOW())
WHERE profile_completed = false
  AND phone IS NOT NULL
  AND district IS NOT NULL
  AND district <> 'Not specified'
  AND block IS NOT NULL
  AND block <> 'Not specified'
  AND COALESCE(land_size_kattha, 0) > 0
  AND primary_crop IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_farmers_profile_completed
  ON farmers(profile_completed);
