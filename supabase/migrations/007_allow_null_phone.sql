-- ═══════════════════════════════════════════════════════════════════
--  Migration 007: Allow NULL phone on farmers
--  Social sign-in (Google/Firebase) creates farmer profiles before the
--  user has provided a phone number — phone is collected later during
--  profile completion, so the column must be nullable.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE farmers ALTER COLUMN phone DROP NOT NULL;

-- Also ensure land_size_bigha stays a generated column (it is derived
-- from land_size_kattha and must never be written directly).
-- No-op if already generated; safe to run on legacy schemas where it
-- was a plain column — in that case leave it as-is.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farmers'
      AND column_name = 'land_size_bigha'
      AND is_generated = 'NEVER'
  ) THEN
    -- Plain column on legacy schema: backfill derived values once.
    UPDATE farmers
    SET land_size_bigha = ROUND(COALESCE(land_size_kattha, 0) / 20.0, 3)
    WHERE land_size_bigha IS NULL OR land_size_bigha = 0;
  END IF;
END $$;
