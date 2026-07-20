# Improvement Backlog

These follow-up improvements were intentionally deferred from the v1.9.0 region, bundle, and CI work.

## Completed in v1.10.0

1. Added a bootstrap API endpoint that returns family membership and the primary grocery list in one authenticated request.
2. Added response timing headers and a repeatable analyzer for Speed Insights and structured API timing data.
3. Reviewed dependency vulnerabilities individually and applied compatible security upgrades without `npm audit fix --force`.

## Next candidates

All previously deferred v1.9.0 follow-ups are now implemented, including
end-to-end release tests and encrypted, restore-verified Supabase backups.
Continue using Speed Insights, structured logs, and the resilience runbook to
identify the next evidence-backed improvements.
