# Migration Audit — Auth Mapping & RLS

## Canonical mapping

- Canonical farmer→Supabase Auth link: `public.farmers.auth_user_id`.
- Legacy duplicate `public.farmers.supabase_auth_id` from migration 001 is backfilled into `auth_user_id` by migration 004, then dropped.
- Backend code already uses `auth_user_id` only (`farmers.repository`, `farmers.service`, `middleware/auth`).

## Migration status

- 001 creates base schema but also creates `supabase_auth_id` and legacy RLS policies.
- 002 adds `profile_completed` / `profile_completed_at`; columns already exist in 001, so 002 is redundant but safe (`IF NOT EXISTS` + guarded backfill).
- 003 adds `auth_user_id`, unique index, conditional FK, and farmers-only RLS.
- 004 reconciles auth mapping, drops legacy `supabase_auth_id` policies/column, enables missing RLS, tightens grants, and recreates owner-scoped policies.
- 005 is guarded and must not run until Supabase Auth cutover is verified.

## RLS audit after 004

- Public read-only: `crops`, `schemes`, `scheme_eligibility_rules`, `scheme_documents`, `agricultural_advisories`.
- Owner-only authenticated CRUD: `farmer_crops`, `scheme_applications`, `disease_detections`, `ai_chat_sessions`, `ai_chat_messages`.
- `farmers`: authenticated select/insert/update/delete only where `auth.uid() = auth_user_id`.
- `password_resets`: authenticated select/delete own rows only; no client insert/update.
- `anon` has no write access to public or farmer-owned tables.

## Execution instructions

1. Take a Supabase backup / PITR snapshot.
2. Confirm remote migration history; do not edit 001–003 if already applied.
3. Run `001`, `002`, `003`, then `004` in the Supabase SQL editor for a clean project.
4. If 001–003 are already applied, run only `004`.
5. Verify with two Supabase test users before enabling `SUPABASE_OAUTH_ENABLED`.
6. Run `005` only after Supabase Auth is verified and legacy password login is disabled.

## Blockers

- Supabase publishable/secret keys are still invalid/missing, so remote migration status and two-user RLS tests could not be executed.
- Supabase CLI is not installed; remote `migration list`/`db push --dry-run` unavailable.
