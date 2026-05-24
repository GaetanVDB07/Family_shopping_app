# Family Grocery Shopping App

A collaborative grocery list application for families, with shared family spaces and real-time list updates.

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- TanStack Query
- Wouter

### Backend
- Express with TypeScript (local dev and self-host)
- Vercel serverless (`api/index.js`) in production
- Drizzle ORM
- Zod validation

### Database & Auth
- PostgreSQL (Supabase-hosted)
- Supabase Auth and Realtime

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- PostgreSQL database credentials for persistent environments

### Install

```bash
npm install
```

### Environment

Create a `.env` file from `.env.example`, or use the environment helpers when available:

```bash
cp .env.example .env
```

Required values:

```env
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:5000`.

## Scripts

- `npm run dev` - start the development server
- `npm run build` - build the client for production
- `npm run build:prod` - build with production environment values
- `npm run start` - start the production server
- `npm run start:prod` - start with production environment values
- `npm run check` - run TypeScript checks
- `npm test` - run tests
- `npm run db:push` - push database schema changes
- `npm run db:push:dev` - push schema using development environment values
- `npm run db:push:prod` - push schema using production environment values
- `npm run fix:start` - start a fix branch from develop with a version bump
- `npm run hotfix:start` - start a hotfix branch from main with a version bump

## Repository Flow

This repository uses a three-level branch flow:

1. `main` is the production branch.
   - Only production-ready releases are merged into `main`.
   - Deployments to production should come from `main`.

2. `develop` is the development release branch.
   - Completed feature work is merged into `develop` first.
   - `develop` is where development releases are tested before production.
   - If someone says `dev`, treat that as this `develop` branch unless a separate `dev` branch is created later.

3. Work branches are created from `develop`.
   - **Feature branches** (`feature/*`) for new functionality.
   - **Fix branches** (`fix/*`) for non-production bugfixes on `develop`.
   - Direct pushes to `develop` are blocked. All changes must go through a pull request.
   - Merge work branches back into `develop`, not directly into `main`.

Recommended feature flow:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-change

# make changes, bump version in package.json + package-lock.json, test, commit

git push -u origin HEAD
# open a PR into develop
```

Recommended fix flow:

```bash
npm run fix:start -- family-code-copy

# apply the fix, commit, push, and open a PR into develop
git add -A
git commit -m "Fix family code copy button"
git push -u origin HEAD
```

When a development release is ready for production, open a PR from `develop` into `main`.

For a hotfix that must go straight to production:

```bash
npm run hotfix:start -- login-error

# apply the fix, commit, push, and open a PR into main
git add -A
git commit -m "Fix login error on mobile"
git push -u origin HEAD
```

Hotfix PRs into `main` must include a valid version bump from production. After the hotfix merges, GitHub Actions automatically syncs `main` back into `develop`. If that sync fails because of merge conflicts, resolve them on an `automation/sync-main-*` PR or a manual `fix/*` branch and open a PR into `develop`.

## Versioning Rules

The app version is stored in the root `package.json`.

Every merge into `develop` must include a version bump. Merges into `main` promote the version already on `develop` and must be greater than the current production version. This project uses a custom `MAJOR.RELEASE.UPDATE` versioning rule:

- Third number: bugfixes and new features, for example `1.1.0` to `1.1.1`.
- Second number: breaking releases, or when the third number would go past `9`, for example `1.1.9` to `1.2.0`.
- First number: reserved for a very large product milestone or full generation change, for example `1.9.9` to `2.0.0`.

Examples:

- Bugfix release: `1.1.0` to `1.1.1`
- New feature release: `1.1.1` to `1.1.2`
- Third-number rollover: `1.1.9` to `1.2.0`
- Breaking release: `1.1.4` to `1.2.0`

The current app version is shown on the `Mijn Families` page as `Vx.y.z`. Because the UI reads the version from `package.json` during the build, updating the package version updates the displayed app version.

Pull request checks enforce this flow:

- PRs into `develop`: must come from `feature/*`, `fix/*`, or automation sync branches, and include a version bump.
- PRs into `main` from `develop`: version must already be greater than production.
- PRs into `main` from hotfix branches: version must bump from production using the same rules.
- After every push to `main`, GitHub Actions syncs `main` back into `develop` automatically.
- `develop` requires PRs from `feature/*`, `fix/*`, or automation sync branches, but no manual approval is required.

## Project Structure

```text
client/                 React frontend
  src/
    components/         React components
    hooks/              Custom hooks
    pages/              Page components
    lib/                Frontend utilities
api/                    Shared API handler (Vercel + Express)
server/                 Express dev/prod host
shared/                 Shared types and schemas
scripts/                Utility scripts
docs/                   Additional documentation
tests/                  Automated tests
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — system diagrams, data flow, tech stack, and repo layout

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
