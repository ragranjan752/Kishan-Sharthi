-- ═══════════════════════════════════════════════════════════════════
--  KRISHI SARTHI — Migration 003: Supabase Auth Foundation (Phase 1)
--  Links farmer profiles to Supabase auth.users without breaking the
--  existing app-JWT session flow. Firebase removal happens only after
--  Supabase Auth parity is verified.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_auth_user_id
  ON public.farmers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Add FK only when Supabase auth schema is present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'farmers'
        AND constraint_name = 'farmers_auth_user_id_fkey'
    ) THEN
      ALTER TABLE public.farmers
        ADD CONSTRAINT farmers_auth_user_id_fkey
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Farmer-owned RLS. Service role backend bypasses RLS; these policies
-- protect direct anon/authenticated Supabase client access.
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farmers_select_own ON public.farmers;
CREATE POLICY farmers_select_own ON public.farmers
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS farmers_insert_own ON public.farmers;
CREATE POLICY farmers_insert_own ON public.farmers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS farmers_update_own ON public.farmers;
CREATE POLICY farmers_update_own ON public.farmers
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS farmers_delete_own ON public.farmers;
CREATE POLICY farmers_delete_own ON public.farmers
  FOR DELETE TO authenticated
  USING (auth.uid() = auth_user_id);
