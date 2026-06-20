---
applyTo: '**'
---
Before creating new scripts always check the existing scripts folder to see if there is already is a script that fulfills the same purpose.

Branch flow:
- `main` is production.
- `develop` is the development release branch. If a request says `dev`, treat it as `develop` unless a separate `dev` branch exists.
- Create feature branches from `develop` and merge them back into `develop`.
- Do not merge feature branches directly into `main`.

Release/version rule:
- Every merge into `develop` must include a version bump in the root `package.json` and `package-lock.json`.
- Merges into `main` promote the version already on `develop`; the release version must be greater than production.
- Hotfixes merged directly into `main` must still bump the version; GitHub Actions then syncs `main` back into `develop`.
- This project uses a custom `MAJOR.RELEASE.UPDATE` rule, not standard semantic versioning.
- Bugfixes and new features both increment the third number, for example `1.1.0` to `1.1.1`.
- Breaking releases increment the second number and reset the third number, for example `1.1.4` to `1.2.0`.
- If the third number would go past `9`, increment the second number and reset the third number, for example `1.1.9` to `1.2.0`.
- The app displays the root package version on the `Mijn Families` page as `Vx.y.z`, so bump the version when merging features into `develop`.

Supabase Auth email (agents and automation):
- Do not call `signUp()` or `resetPasswordForEmail()` against hosted Supabase with fake or invalid emails; bounces can restrict project email sending.
- Prefer local Supabase (`npx supabase start`) for auth flows; emails are captured in Mailpit.
- Hosted integration tests must use `SUPABASE_SERVICE_ROLE_KEY` and `auth.admin.createUser({ email_confirm: true })` (see `scripts/test-family-setup-flow.mjs`).
- Vitest (`npm test -- --run`) mocks auth and does not send email.
- Production should use custom SMTP in the Supabase dashboard (Authentication → SMTP).
