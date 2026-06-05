# AGENTS.md

## Cursor Cloud specific instructions

### Product

Family Grocery Shopping App — React + Express/Vite dev server on port **5000**, PostgreSQL via Supabase, Supabase Auth + Realtime.

### Dependency refresh (automatic)

`npm ci` on startup is sufficient for Node dependencies.

### Local full-stack development

The dev server reads **`.env.development`** (not `.env`). That file is gitignored and is not committed.

**Option A — Local Supabase (recommended for agents without cloud credentials)**

1. Ensure Docker is running. In this Cloud VM, Docker may need a manual daemon start:
   ```bash
   sudo dockerd > /tmp/dockerd.log 2>&1 &
   sudo chmod 666 /var/run/docker.sock
   ```
2. Initialize and start Supabase (first time only for `init`):
   ```bash
   npx supabase@latest init --yes   # if supabase/ does not exist
   npx supabase@latest start
   ```
3. Create `.env.development` from `npx supabase@latest status -o env` (use `API_URL`, `DB_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` for the `SUPABASE_*` / `VITE_*` vars — see `.env.example`).
4. Push schema and enable realtime:
   ```bash
   cp .env.development .env && npm run db:push
   sudo docker exec -i supabase_db_workspace psql -U postgres -d postgres < scripts/enable-realtime.sql
   ```
5. Start the app: `npm run dev` → http://localhost:5000

**Option B — Hosted Supabase**

Copy `.env.example` to `.env.development`, fill in your dev project credentials, then `npm run db:push:dev` and run `scripts/enable-realtime.sql` in the Supabase SQL editor.

### Verify without external services

These do not require Supabase or Docker:

- `npm run check` — TypeScript
- `npm test -- --run` — Vitest (48 tests; API tests use mocks)

### Run / lint / test commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Typecheck | `npm run check` |
| Tests | `npm test -- --run` |
| DB schema push | `npm run db:push:dev` |
| Production build | `npm run build` |

### Gotchas

- `server/index.ts` loads `.env.development` when `NODE_ENV=development`.
- Port **5000** is the only non-firewalled port in Cloud Agent VMs.
- Realtime grocery sync requires `scripts/enable-realtime.sql` after schema push.
- `supabase/` is gitignored; run `npx supabase init` locally if missing.
