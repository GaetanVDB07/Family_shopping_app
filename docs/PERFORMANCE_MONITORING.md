# Production performance monitoring

Vercel Speed Insights tracks real-user web vitals. The API emits structured
`api_request_completed` and `api_stage_completed` events with the request ID,
route, Vercel region, duration, and stage details. API responses also expose
`Server-Timing` and `X-Request-Id` headers for browser-side correlation.

After enough production traffic has accumulated, export the last seven days of
API timing events and rank the slowest p95 stages:

```powershell
vercel logs --project family-shopping-app --environment production --since 7d --json --no-branch | npm run analyze:api-timings
```

Use at least 20 samples before treating a stage as representative. Compare the
slowest API stages with Speed Insights' LCP and INP trends before deciding which
query or UI path to optimize next.
