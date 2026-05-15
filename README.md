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
- Express with TypeScript
- WebSockets
- Drizzle ORM
- Zod validation

### Database
- PostgreSQL, with Neon/Supabase-oriented configuration

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

## Repository Flow

This repository uses a three-level branch flow:

1. `main` is the production branch.
   - Only production-ready releases are merged into `main`.
   - Deployments to production should come from `main`.

2. `develop` is the development release branch.
   - Completed feature work is merged into `develop` first.
   - `develop` is where development releases are tested before production.
   - If someone says `dev`, treat that as this `develop` branch unless a separate `dev` branch is created later.

3. Feature branches are created from `develop`.
   - Branch from the latest `develop`.
   - Use a clear name, for example `feature/add-family-invites` or `fix/family-code-copy`.
   - Merge feature branches back into `develop`, not directly into `main`.

Recommended flow:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-change

# make changes, test, commit

git checkout develop
git pull origin develop
git merge feature/your-change
git push origin develop
```

When a development release is ready for production:

```bash
git checkout develop
git pull origin develop

# update the version before merging to main
npm version minor --no-git-tag-version

git add package.json package-lock.json
git commit -m "Bump version to 1.1.0"

git checkout main
git pull origin main
git merge develop
git push origin main
```

## Versioning Rules

The app version is stored in the root `package.json`.

Every merge from `develop` to `main` must include a version bump. Use semantic versioning:

- Patch release: `1.0.0` to `1.0.1` for small fixes
- Minor release: `1.0.0` to `1.1.0` for new features
- Major release: `1.0.0` to `2.0.0` for breaking changes

The current app version is shown on the `Mijn Families` page as `Vx.y.z`. Because the UI reads the version from `package.json` during the build, updating the package version updates the displayed app version.

## Project Structure

```text
client/                 React frontend
  src/
    components/         React components
    hooks/              Custom hooks
    pages/              Page components
    lib/                Frontend utilities
server/                 Express backend
shared/                 Shared types and schemas
scripts/                Utility scripts
docs/                   Additional documentation
tests/                  Automated tests
```

## License

This project is distributed under a custom license that forbids copying or selling without permission. See [LICENSE](LICENSE) for details.
