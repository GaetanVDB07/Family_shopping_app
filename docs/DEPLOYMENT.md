# Deployment Guide

## Development vs Production Setup

### Development Environment
- **Database**: Separate development database (Neon or local PostgreSQL)
- **Supabase**: Development project
- **Domain**: localhost:5000
- **Environment**: `.env.development`

### Production Environment  
- **Database**: Production database (Supabase Postgres)
- **Supabase**: Production project
- **Domain**: https://family-shopping-app-eta.vercel.app
- **Environment**: `.env.production` locally; Vercel env vars in production

> **Note:** `family-shopping-app.vercel.app` is not linked to this project (API returns 404). Use **`family-shopping-app-eta.vercel.app`** as the production URL. Set GitHub secret `PROD_BASE_URL` to that URL for the keepalive workflow.

## Setup Steps

### 1. Create Development Database
1. Go to [Neon](https://neon.tech) and create a new database for development
2. Copy the connection string to `.env.development`

### 2. Create Production Database
1. Create another Neon database for production
2. Copy the connection string to `.env.production`

### 3. Create Supabase Projects
1. Go to [Supabase](https://supabase.com)
2. Create a development project
3. Create a production project
4. Copy the URLs and keys to respective `.env` files

### 4. Local Development
```bash
# Copy development environment
npm run dev:load-env

# Or manually:
cp .env.development .env
npm run dev
```

### 5. Deploy to Production

#### Option A: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Set environment variables in Vercel dashboard

#### Option B: Railway
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

#### Option C: Render
1. Connect your GitHub repo to Render
2. Set environment variables in Render dashboard
3. Deploy automatically on git push

## Development Workflow

### Daily Development
```bash
# Start development server
npm run dev:load-env

# Make changes and test locally
# Commit and push to git
git add .
git commit -m "Your changes"
git push origin main
```

### Deploy Updates to Production
```bash
# Build for production
npm run build:prod

# Deploy (if using Vercel)
vercel --prod

# Or just push to main branch if using auto-deployment
git push origin main
```

## Database Migrations

### Development
```bash
npm run db:push:dev
```

### Production
```bash
npm run db:push:prod
```

## Environment Variables Needed

Copy these to your actual `.env.development` and `.env.production` files:

### Development
- `DATABASE_URL`: Your development database connection string
- `SUPABASE_URL`: Your development Supabase project URL
- `SUPABASE_ANON_KEY`: Your development Supabase anon key
- `VITE_SUPABASE_URL`: Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY`: Same as SUPABASE_ANON_KEY

### Production
- Same variables but pointing to production services
- `CRON_SECRET`: Random secret for `/api/cron/keepalive` (required in production)

## Keepalive cron

Supabase free-tier projects **pause after ~7 days of inactivity**. A paused project means auth, Realtime, and the database are unavailable until someone wakes it up manually.

The app runs a daily keepalive that:

1. Runs `SELECT 1` against Postgres (keeps the DB connection warm)
2. Sends a lightweight Supabase REST query (keeps the Supabase project active)

Two schedulers hit the same endpoint so one failure does not leave the stack idle:

| Scheduler | Config | Schedule |
|-----------|--------|----------|
| Vercel cron | `vercel.json` | Daily 03:00 UTC |
| GitHub Actions | `.github/workflows/keepalive.yml` | Daily 02:08 UTC |

The endpoint is protected with `CRON_SECRET` in production. Unauthenticated requests get **401**; if the secret is missing in production, the handler returns **503** (fail closed).

### Setup

1. Generate a secret: `openssl rand -hex 32`
2. **Vercel** — add `CRON_SECRET` to Production environment variables. Vercel cron automatically sends `Authorization: Bearer <CRON_SECRET>` when invoking the route.
3. **GitHub** — add repo secrets:
   - `CRON_SECRET` — same value as Vercel
   - `PROD_BASE_URL` — e.g. `https://family-shopping-app-eta.vercel.app` (no trailing slash)

Verify manually:

```bash
curl -i https://family-shopping-app-eta.vercel.app/api/cron/keepalive
# Expect 401 Unauthorized

curl -i -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://family-shopping-app-eta.vercel.app/api/cron/keepalive
# Expect 200 { "ok": true, "message": "keepalive ok" }
```

You can also run the GitHub workflow manually (**Actions → Keep Supabase alive → Run workflow**).
