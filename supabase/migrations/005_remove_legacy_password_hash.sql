-- ═══════════════════════════════════════════════════════════════════
--  KRISHI SARTHI — Migration 005: Legacy Password Hash Removal (GUARDED)
--  DO NOT RUN until Supabase Auth is verified, all farmers are migrated,
--  legacy login is disabled, and a database backup exists.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF current_setting('app.krishi_sarthi_allow_legacy_password_drop', true)
     IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION
      'Legacy password_hash removal is disabled. Set app.krishi_sarthi_allow_legacy_password_drop = true only after Supabase Auth cutover, backup, and verification.';
  END IF;
END $$;

ALTER TABLE public.farmers
  DROP COLUMN IF EXISTS password_hash;
