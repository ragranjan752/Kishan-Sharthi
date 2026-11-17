-- ═══════════════════════════════════════════════════════════════════
--  KRISHI SARTHI — Migration 004: Auth Mapping + RLS Reconciliation
--  Canonical farmer→auth link is public.farmers.auth_user_id.
--  Safe to run after 001–003. Does not delete farmer business data.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Canonical auth mapping ────────────────────────────────────────
ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Backfill only missing links from the legacy 001 column when present.
-- auth_user_id wins; no existing auth_user_id values are overwritten.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'farmers'
      AND column_name = 'supabase_auth_id'
  ) THEN
    UPDATE public.farmers f
    SET auth_user_id = f.supabase_auth_id
    WHERE f.auth_user_id IS NULL
      AND f.supabase_auth_id IS NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_auth_user_id
  ON public.farmers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Add FK only when auth schema exists and no orphan auth_user_id values remain.
DO $$
DECLARE
  bad_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    SELECT count(*) INTO bad_count
    FROM public.farmers f
    WHERE f.auth_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = f.auth_user_id);

    IF bad_count > 0 THEN
      RAISE EXCEPTION 'farmers.auth_user_id has % value(s) not present in auth.users; resolve before adding FK', bad_count;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
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

-- ── 2. Drop legacy policies that reference supabase_auth_id ──────────
DROP POLICY IF EXISTS "Farmers select own profile" ON public.farmers;
DROP POLICY IF EXISTS "Farmers update own profile" ON public.farmers;
DROP POLICY IF EXISTS "Farmers access own crops" ON public.farmer_crops;
DROP POLICY IF EXISTS "Farmers access own detections" ON public.disease_detections;
DROP POLICY IF EXISTS "Farmers access own chats" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Farmers access own messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Farmers access own applications" ON public.scheme_applications;

-- Legacy duplicate auth column is no longer referenced by code.
ALTER TABLE public.farmers DROP COLUMN IF EXISTS supabase_auth_id;

-- ── 3. Ensure RLS is enabled where required ──────────────────────────
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- ── 4. Privilege boundaries ──────────────────────────────────────────
-- Public reference data: read-only for anon/authenticated.
REVOKE ALL PRIVILEGES ON public.crops,
  public.schemes,
  public.scheme_eligibility_rules,
  public.scheme_documents,
  public.agricultural_advisories
FROM anon, authenticated;

GRANT SELECT ON public.crops,
  public.schemes,
  public.scheme_eligibility_rules,
  public.scheme_documents,
  public.agricultural_advisories
TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.crops,
  public.schemes,
  public.scheme_eligibility_rules,
  public.scheme_documents,
  public.agricultural_advisories
FROM anon, authenticated;

-- Farmer-owned child tables: authenticated role may use owner-scoped RLS policies.
REVOKE ALL PRIVILEGES ON public.farmer_crops,
  public.scheme_applications,
  public.disease_detections,
  public.ai_chat_sessions,
  public.ai_chat_messages
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_crops,
  public.scheme_applications,
  public.disease_detections,
  public.ai_chat_sessions,
  public.ai_chat_messages
TO authenticated;

-- Password resets are backend-only writes; authenticated users may only read/delete own rows.
REVOKE ALL PRIVILEGES ON public.password_resets FROM anon, authenticated;
GRANT SELECT, DELETE ON public.password_resets TO authenticated;

-- ── 5. Canonical public read policies ────────────────────────────────
DROP POLICY IF EXISTS crops_public_read ON public.crops;
CREATE POLICY crops_public_read ON public.crops
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS schemes_public_read ON public.schemes;
CREATE POLICY schemes_public_read ON public.schemes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS scheme_rules_public_read ON public.scheme_eligibility_rules;
CREATE POLICY scheme_rules_public_read ON public.scheme_eligibility_rules
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS scheme_documents_public_read ON public.scheme_documents;
CREATE POLICY scheme_documents_public_read ON public.scheme_documents
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS advisories_public_read ON public.agricultural_advisories;
CREATE POLICY advisories_public_read ON public.agricultural_advisories
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── 6. Farmers table: canonical auth_user_id policies ────────────────
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

-- ── 7. Farmer-owned child tables: owner-scoped CRUD policies ─────────
-- farmer_id must equal the farmer row linked to auth.uid().

DROP POLICY IF EXISTS farmer_crops_select_own ON public.farmer_crops;
CREATE POLICY farmer_crops_select_own ON public.farmer_crops
  FOR SELECT TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS farmer_crops_insert_own ON public.farmer_crops;
CREATE POLICY farmer_crops_insert_own ON public.farmer_crops
  FOR INSERT TO authenticated
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS farmer_crops_update_own ON public.farmer_crops;
CREATE POLICY farmer_crops_update_own ON public.farmer_crops
  FOR UPDATE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()))
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS farmer_crops_delete_own ON public.farmer_crops;
CREATE POLICY farmer_crops_delete_own ON public.farmer_crops
  FOR DELETE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS scheme_applications_select_own ON public.scheme_applications;
CREATE POLICY scheme_applications_select_own ON public.scheme_applications
  FOR SELECT TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS scheme_applications_insert_own ON public.scheme_applications;
CREATE POLICY scheme_applications_insert_own ON public.scheme_applications
  FOR INSERT TO authenticated
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS scheme_applications_update_own ON public.scheme_applications;
CREATE POLICY scheme_applications_update_own ON public.scheme_applications
  FOR UPDATE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()))
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS scheme_applications_delete_own ON public.scheme_applications;
CREATE POLICY scheme_applications_delete_own ON public.scheme_applications
  FOR DELETE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS disease_detections_select_own ON public.disease_detections;
CREATE POLICY disease_detections_select_own ON public.disease_detections
  FOR SELECT TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS disease_detections_insert_own ON public.disease_detections;
CREATE POLICY disease_detections_insert_own ON public.disease_detections
  FOR INSERT TO authenticated
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS disease_detections_update_own ON public.disease_detections;
CREATE POLICY disease_detections_update_own ON public.disease_detections
  FOR UPDATE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()))
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS disease_detections_delete_own ON public.disease_detections;
CREATE POLICY disease_detections_delete_own ON public.disease_detections
  FOR DELETE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS ai_chat_sessions_select_own ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_select_own ON public.ai_chat_sessions
  FOR SELECT TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS ai_chat_sessions_insert_own ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_insert_own ON public.ai_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS ai_chat_sessions_update_own ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_update_own ON public.ai_chat_sessions
  FOR UPDATE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()))
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS ai_chat_sessions_delete_own ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_delete_own ON public.ai_chat_sessions
  FOR DELETE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS ai_chat_messages_select_own ON public.ai_chat_messages;
CREATE POLICY ai_chat_messages_select_own ON public.ai_chat_messages
  FOR SELECT TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS ai_chat_messages_insert_own ON public.ai_chat_messages;
CREATE POLICY ai_chat_messages_insert_own ON public.ai_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS ai_chat_messages_update_own ON public.ai_chat_messages;
CREATE POLICY ai_chat_messages_update_own ON public.ai_chat_messages
  FOR UPDATE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()))
  WITH CHECK (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS ai_chat_messages_delete_own ON public.ai_chat_messages;
CREATE POLICY ai_chat_messages_delete_own ON public.ai_chat_messages
  FOR DELETE TO authenticated
  USING (farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid()));

-- ── 8. Password resets: owner read/delete only, no client writes ─────
DROP POLICY IF EXISTS password_resets_select_own ON public.password_resets;
CREATE POLICY password_resets_select_own ON public.password_resets
  FOR SELECT TO authenticated
  USING (
    farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid())
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS password_resets_delete_own ON public.password_resets;
CREATE POLICY password_resets_delete_own ON public.password_resets
  FOR DELETE TO authenticated
  USING (
    farmer_id = (SELECT id FROM public.farmers WHERE auth_user_id = auth.uid())
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

COMMIT;
