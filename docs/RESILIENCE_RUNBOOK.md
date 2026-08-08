# Production resilience runbook

## Automated checks

- `production-health.yml` runs every 30 minutes. It samples `/api/ping`, verifies
  the unauthenticated 401 guard, calls the protected database keepalive, and
  fails after three consecutive checks where p95 latency exceeds 1500 ms or a
  service returns an unexpected status. It reuses one GitHub issue across
  outages and closes it after recovery.
- When `VERCEL_TOKEN` is configured, the same workflow also checks recent
  structured runtime logs for elevated 401/500 rates and slow p95 responses.
- `database-backup.yml` creates an AES-256-GCM encrypted logical backup of
  `families`, `family_members`, and `grocery_items` every day. Before retention,
  it restores the dump into an isolated Postgres 17 container and validates row
  counts and foreign keys. Encrypted artifacts are retained for 14 days.

Required GitHub secrets:

- `PROD_BASE_URL` and `CRON_SECRET` for synthetic monitoring.
- `SUPABASE_DB_URL` using a session-mode or direct Supabase database connection.
- `BACKUP_ENCRYPTION_KEY`, at least 24 random characters.
- Optional `VERCEL_TOKEN` for rate-based 401/500 and runtime-latency checks.

## Restore drill

1. Open the latest successful **Encrypted database backup** workflow run and
   copy its run ID.
2. Dispatch **Verify retained backup restore** with that run ID.
3. Confirm the workflow decrypts the retained artifact, restores it only into a
   temporary Postgres container, and reports counts for all three tables plus at
   least two foreign keys.
4. Record the run URL and date in the release notes. Run this drill monthly and
   after any schema change.

## Production restore

Never point the restore-drill workflow at production. A production restoration
requires explicit approval, a maintenance window, a fresh backup, and a written
recovery point. Prefer Supabase Dashboard physical/PITR restore when available,
because it includes Auth and managed schemas. The encrypted logical backup is a
second recovery path for application data only; it does not replace Supabase
Auth or Storage backups.

Before restoring production:

1. Stop application writes and notify users of downtime.
2. Confirm the selected recovery point and expected data-loss window.
3. Export a fresh encrypted logical backup.
4. Use Supabase Dashboard **Database → Backups** for physical/PITR restoration,
   or restore the logical dump to a new project first.
5. Reapply RLS and Realtime configuration, verify table counts, sign-in, family
   selection, list mutation, and settings/logout flows.
6. Resume writes only after both database and application smoke tests pass.
