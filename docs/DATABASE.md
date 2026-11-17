# Database

## Storage

- Primary database: Supabase Postgres, accessed server-side through `@supabase/supabase-js`.
- Local legacy SQLite file `kisan_sarthi.db` is preserved at repo root; current modular backend uses Supabase, not sqlite.

## Schema sources

- `backend/database/schema.sql` — base schema asset.
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_profile_completion.sql`
- `supabase/migrations/003_supabase_auth_foundation.sql`
- `supabase/migrations/004_reconcile_auth_user_id_and_rls.sql`
- `supabase/migrations/005_remove_legacy_password_hash.sql` (guarded; post-cutover only)

Run migrations manually in the Supabase SQL editor in order. Do not run them automatically during local restructuring. See `docs/MIGRATION_AUDIT.md` for the auth/RLS reconciliation audit.

## Key tables

- `farmers` — farmer profile; canonical Supabase Auth link is `auth_user_id` (legacy `supabase_auth_id` is backfilled/dropped by migration 004). Includes `profile_completed`, phone uniqueness, district/block/land/crop fields.
- Scheme, detection, chat/Sarthi, mandi, marketplace, equipment, traceability, notification tables are defined by the schema/migrations and consumed by `backend/src/modules/*`.

## Security

- RLS is reconciled by migration 004: public tables are read-only, farmer-owned tables are owner-scoped, `password_resets` has no client writes, and `crops` has public read only.
- Backend uses secret key only for privileged/admin operations; publishable/anon key is for user-scoped clients.
- Never expose `SUPABASE_SECRET_KEY` to the frontend.
- `farmers.password_hash` remains for legacy login until Supabase Auth is verified; removal is guarded by migration 005.
