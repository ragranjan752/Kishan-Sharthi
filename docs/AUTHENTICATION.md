# Authentication

## Current state

- Firebase Authentication is still the active social/email-token fallback.
- Express issues application JWTs for protected API calls.
- Supabase Auth groundwork exists but is not the active login path yet.
- Facebook authentication has been removed; no active Facebook references remain.

## Active flows

- Email/password: `POST /api/v1/auth/register`, `/auth/login` → app JWT in `localStorage.token`.
- Google: frontend Firebase popup → ID token → `POST /api/v1/auth/google` → app JWT.
- Password reset: `/auth/forgot-password`, `/auth/reset-password`.

## Supabase groundwork

- `backend/src/middleware/auth.js` can validate Supabase access tokens via `authenticateSupabase`.
- `POST /api/v1/farmers/bootstrap` links/creates farmer by verified Supabase user.
- `farmers.auth_user_id` links profiles to `auth.users.id`.
- `frontend/supabase-auth.js` provides PKCE/session helpers and syncs Supabase `access_token` into the existing token slot.
- `farmers.password_hash` is retained for legacy email/password login until Supabase Auth is verified; removal is guarded by `supabase/migrations/005_remove_legacy_password_hash.sql`.

## Key names

- Frontend-safe: `SUPABASE_PUBLISHABLE_KEY` (legacy `SUPABASE_ANON_KEY` supported).
- Server-only privileged: `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` supported).
- The secret key is never used as a fallback for user-scoped/publishable clients.

## Next phase gate

Enable `SUPABASE_OAUTH_ENABLED=true` only after real Supabase email/Google OAuth is verified in a browser.
