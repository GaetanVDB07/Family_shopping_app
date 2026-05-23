#!/usr/bin/env node
/**
 * Start a hotfix branch from main and bump the app version.
 * Usage: node scripts/start-hotfix.mjs [short-name]
 * Example: node scripts/start-hotfix.mjs login-error
 */
import { execSync } from 'child_process';

const slug = process.argv[2]?.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
if (!slug) {
  console.error('Usage: node scripts/start-hotfix.mjs <short-name>');
  console.error('Example: node scripts/start-hotfix.mjs login-error');
  process.exit(1);
}

const branch = `hotfix/${slug}`;

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

run('git fetch origin main');
run(`git checkout -B ${branch} origin/main`);
run('npm version patch --no-git-tag-version');

console.log('');
console.log(`Hotfix branch "${branch}" is ready from origin/main with a version bump.`);
console.log('Next steps:');
console.log('  1. Apply the production fix');
console.log('  2. git add -A && git commit -m "Fix ..."');
console.log('  3. git push -u origin HEAD');
console.log('  4. Open a PR into main');
console.log('After merge, GitHub Actions will sync main back into develop automatically.');
