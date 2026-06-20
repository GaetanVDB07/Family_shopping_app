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
4. Push schema, enable RLS, and enable realtime:
   ```bash
   cp .env.development .env && npm run db:push
   sudo docker exec -i supabase_db_workspace psql -U postgres -d postgres < scripts/enable-rls.sql
   sudo docker exec -i supabase_db_workspace psql -U postgres -d postgres < scripts/enable-realtime.sql
   ```
5. Start the app: `npm run dev` → http://localhost:5000

**Option B — Hosted Supabase**

Copy `.env.example` to `.env.development`, fill in your dev project credentials, then `npm run db:push:dev` and run `scripts/enable-rls.sql` and `scripts/enable-realtime.sql` in the Supabase SQL editor.

### Verify without external services

These do not require Supabase or Docker:

- `npm run check` — TypeScript
- `npm test -- --run` — Vitest (72 tests; API tests use mocks)

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
- RLS policies (`scripts/enable-rls.sql`) and Realtime (`scripts/enable-realtime.sql`) must be applied after schema push.
- `supabase/` is gitignored; run `npx supabase init` locally if missing.

### Supabase Auth email (do not bounce hosted projects)

Hosted Supabase projects use a **built-in SMTP service for demos only**. Sign-up confirmations and password-reset emails sent to invalid, fake, or typo addresses **bounce**, which can trigger Supabase warnings and **temporary email sending restrictions**.

The **issue-worker Cursor automation** (`.cursor/automation/issue-worker.md`) includes these rules in its prompt. Keep that file in sync if you change automation instructions in the Cursor dashboard.

**Agents and automation must follow these rules:**

1. **Prefer local Supabase for auth testing.** `npx supabase@latest start` captures auth emails in **Mailpit** (`npx supabase@latest status` shows the URL). No real outbound mail is sent.
2. **Never call `signUp()` or `resetPasswordForEmail()` against a hosted Supabase project** with fake addresses (`@example.com`, `@test.dev`, `@example.invalid`, made-up inboxes, etc.).
3. **Hosted integration tests** that need users must use the **service role** and `auth.admin.createUser({ email_confirm: true })` so **no confirmation email is sent**. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.development` when running `scripts/test-family-setup-flow.mjs` against hosted Supabase.
4. **Unit tests are safe** — Vitest mocks auth (`npm test -- --run`) and does not send email.
5. **Production** should use **custom SMTP** (Resend, SendGrid, Postmark, etc.) in the Supabase dashboard under **Authentication → SMTP**. See [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

**If you need to exercise signup or password-reset UI against hosted Supabase**, use only **real inboxes you control** (or a sandbox like Mailtrap wired through custom SMTP). Do not spam reset links to random addresses.

**Scripts that touch auth on hosted Supabase:**

| Script | Safe when |
|--------|-----------|
| `scripts/test-family-setup-flow.mjs` | `SUPABASE_SERVICE_ROLE_KEY` is set, or `SUPABASE_URL` points at local Supabase |
| Manual signup / forgot-password in the app | Real email only; never automated against production |
