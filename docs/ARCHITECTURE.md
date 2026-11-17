# Krishi Sarthi Architecture

## Runtime layout

- `frontend/` — vanilla HTML/CSS/JS served by Express. Firebase config remains for the current auth fallback; Supabase client config is fetched from `/api/config/public`.
- `backend/src/` — Express app, middleware, modules, config, utils.
- `backend/config/` — shared Firebase/Supabase clients used by legacy controllers and modular services.
- `backend/database/` — SQL schema assets.
- `backend/uploads/` — local disease-image uploads served at `/uploads`.
- `backend/tests/` — Jest integration/unit tests.
- `supabase/migrations/` — versioned Supabase/Postgres migrations.
- `docs/` — deployment and project documentation.

## Request flow

Browser → `frontend/index.html` → `frontend/app.js` → `/api/*` or `/api/v1/*` → `backend/src/app.js` → module routes → controllers/services → Supabase/Postgres or external AI providers.

## Auth status

- Current production auth still uses Firebase client + Express JWT during migration.
- Supabase Auth groundwork exists: `auth_user_id` on farmers, `authenticateSupabase`, `/api/v1/farmers/bootstrap`, and `supabase-auth.js` client.
- Enable `SUPABASE_OAUTH_ENABLED=true` only after real Supabase email/Google OAuth is verified.
