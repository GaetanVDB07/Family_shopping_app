#!/usr/bin/env node
/**
 * Start a fix branch from develop and bump the app version.
 * Usage: node scripts/start-fix.mjs [short-name]
 * Example: node scripts/start-fix.mjs family-code-copy
 */
import { execSync } from 'child_process';

const slug = process.argv[2]?.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
if (!slug) {
  console.error('Usage: node scripts/start-fix.mjs <short-name>');
  console.error('Example: node scripts/start-fix.mjs family-code-copy');
  process.exit(1);
}

const branch = `fix/${slug}`;

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

run('git fetch origin develop');
run(`git checkout -B ${branch} origin/develop`);
run('npm version patch --no-git-tag-version');

console.log('');
console.log(`Fix branch "${branch}" is ready from origin/develop with a version bump.`);
console.log('Next steps:');
console.log('  1. Apply the fix');
console.log('  2. git add -A && git commit -m "Fix ..."');
console.log('  3. git push -u origin HEAD');
console.log('  4. Open a PR into develop');
