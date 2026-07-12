# Improvement Backlog

These follow-up improvements were intentionally deferred from the v1.9.0 region, bundle, and CI work.

## Next candidates

1. Add a bootstrap API endpoint that returns family membership and the primary grocery list in one authenticated request.
2. Use Speed Insights and structured API timing data to identify the slowest production stage after enough real-user traffic has accumulated.
3. Review the reported dependency vulnerabilities individually and upgrade safely without a breaking `npm audit fix --force`.
4. Add end-to-end release tests for login, family selection, list loading, item changes, settings, and logout against local Supabase.
5. Verify automated Supabase backups, document a restore drill, and add alerts for API latency and elevated 401/500 responses.
