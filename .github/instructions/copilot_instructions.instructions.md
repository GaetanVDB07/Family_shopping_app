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
- Every merge from `develop` into `main` must include a semantic version bump in the root `package.json` and `package-lock.json`.
- The app displays the root package version on the `Mijn Families` page as `Vx.y.z`, so the version bump must happen before production release.
