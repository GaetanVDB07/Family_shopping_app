# Improvement Backlog

These follow-up improvements were intentionally deferred from the v1.9.0 region, bundle, and CI work.

## Completed in v1.10.0

1. Added a bootstrap API endpoint that returns family membership and the primary grocery list in one authenticated request.
2. Added response timing headers and a repeatable analyzer for Speed Insights and structured API timing data.
3. Reviewed dependency vulnerabilities individually and applied compatible security upgrades without `npm audit fix --force`.

## Next candidates

1. Add end-to-end release tests for login, family selection, list loading, item changes, settings, and logout against local Supabase.
2. Verify automated Supabase backups, document a restore drill, and add alerts for API latency and elevated 401/500 responses.
