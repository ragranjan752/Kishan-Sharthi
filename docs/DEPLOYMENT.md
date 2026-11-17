# Deployment

## Requirements

- Node.js 18+
- Supabase project for Postgres/Auth
- Firebase project for current auth fallback and image storage
- Optional AI provider keys

## Setup

```bash
npm install
# create .env in repo root with real values; never commit it
npm run demo   # development demo on http://localhost:3001
npm test -- --runInBand
```

Active server entrypoint: `backend/src/server.js` via root `npm start` / `npm run dev` / `npm run demo`. Only port `3001` is supported.

## Environment

Required for full operation:

- `JWT_SECRET` — strong random secret, min 32 chars
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- Firebase Admin vars for current fallback/storage
- AI keys as needed

Legacy aliases `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are still accepted.

## Database

Run in Supabase SQL editor, in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_profile_completion.sql`
3. `supabase/migrations/003_supabase_auth_foundation.sql`

`backend/database/schema.sql` is the base schema reference.

## Production notes

- Set `NODE_ENV=production`, `PORT=3001`, `ALLOWED_ORIGINS=http://localhost:3001`.
- Keep `SUPABASE_SECRET_KEY` server-side only.
- Serve `frontend/` through Express static middleware; do not expose `backend/` or `.env`.
- The app only supports port `3001`. If it is occupied, find it with `netstat -ano | findstr :3001` and stop that PID; do not switch ports.
