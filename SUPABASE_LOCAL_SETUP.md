# Local Setup With Supabase (Full Features)

This guide shows how to run the app locally with Supabase so ALL features work: authentication, realtime, storage and edge functions. You will also run the local API for orchestration endpoints.

## Prerequisites
- Node.js 18+
- Docker (for the local API database) OR a local Postgres 15+
- Supabase CLI: https://supabase.com/docs/guides/cli (install via Homebrew, Scoop, or direct download)

## 1) Start Supabase locally
```bash
# From project root
supabase start
```
This launches:
- API (REST) on http://127.0.0.1:54321
- Studio on http://127.0.0.1:54323
- Postgres on 54322 (internal)
- Functions runner (enabled via the next step)

Keep note of the "anon key" shown in the output (or run `supabase status -o json`).

## 2) Serve Edge Functions (required)
Open a new terminal and run:
```bash
supabase functions serve
```
This serves all functions in `supabase/functions/*` locally with hot reload.

## 3) Configure Frontend environment (.env)
Create/Edit `.env` in the project root:
```ini
# Frontend
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<paste your local anon key here>

# Local API (used for orchestration endpoints)
VITE_API_BASE_URL=http://localhost:8081
VITE_API_KEY=dev-api-key
```
Notes:
- With these values present, the UI automatically enables Supabase mode for auth, realtime, storage and functions.
- The UI also uses the local API for orchestration endpoints (plans, uploads, host inventory) — run it in step 4.

## 4) Start the Local API backend
In a new terminal:
```bash
cd api
# Start Postgres & Redis for the API (separate from Supabase's DB)
docker-compose up -d postgres redis

# Install deps and start the API on http://localhost:8081
npm install
npm run dev
```
Migrations will run automatically on first start (or `npm run migrate`).

## 5) Start the Frontend
In another terminal at the project root:
```bash
npm install
npm run dev
```
- App: http://localhost:8080
- Supabase Studio: http://127.0.0.1:54323

## 6) Supabase Auth redirect configuration
This repo already sets `site_url = "http://localhost:8080"` in `supabase/config.toml`.
If sign-up/login redirects fail, verify in Studio:
- Authentication > URL Configuration
  - Site URL: http://localhost:8080
  - Redirect URLs: add http://localhost:8080 if missing

## 7) Verifying everything works
- Visit http://localhost:8080 — complete the setup wizard
- Ensure you can sign up and log in
- Trigger an edge function (e.g., initial setup save) — check logs:
  - Supabase Dashboard > Functions > Logs
- Use the dashboard widgets — inventory and orchestration will use the local API

## FAQ
- Why run both Supabase and the local API? 
  - Supabase provides auth, realtime, storage, and edge functions. The local API handles Redfish/vCenter orchestration endpoints. The frontend uses both.
- Do the databases overlap? 
  - No. Supabase uses its own Postgres. The local API uses Docker Postgres on port 5432 (see `api/docker-compose.yml`). This separation is intentional.
- Can I use only Supabase without the local API?
  - Not yet. Orchestration endpoints are currently served by the local API. Keep both running for full functionality.

## Troubleshooting
- If functions aren’t invoked, ensure `supabase functions serve` is running.
- If auth redirects to the wrong URL, update the Site URL and Redirect URLs as above.
- If the API 8081 returns errors, check `cd api && npm run dev` logs and verify Docker containers are running.
- Port conflicts: change Vite port in `vite.config.ts` or API port in `api/.env`.
