import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseAppVersion(version) {
  const match = VERSION_PATTERN.exec(version);

  if (!match) {
    throw new Error(`Invalid app version "${version}". Expected MAJOR.RELEASE.UPDATE.`);
  }

  const [, major, release, update] = match;
  const parsed = {
    major: Number(major),
    release: Number(release),
    update: Number(update),
  };

  if (parsed.update > 9) {
    throw new Error(`Invalid app version "${version}". The third number cannot be greater than 9.`);
  }

  return parsed;
}

export function formatAppVersion({ major, release, update }) {
  return `${major}.${release}.${update}`;
}

export function getAllowedVersionBumps(baseVersion) {
  const base = parseAppVersion(baseVersion);
  const allowed = [];

  if (base.update < 9) {
    allowed.push(formatAppVersion({ ...base, update: base.update + 1 }));
  }

  allowed.push(formatAppVersion({ major: base.major, release: base.release + 1, update: 0 }));
  allowed.push(formatAppVersion({ major: base.major + 1, release: 0, update: 0 }));

  return allowed;
}

export function validateVersionBump(baseVersion, headVersion) {
  const allowed = getAllowedVersionBumps(baseVersion);

  return {
    valid: allowed.includes(headVersion),
    allowed,
  };
}

export function validatePackageVersions({ packageVersion, lockVersion, lockRootVersion }) {
  const errors = [];

  if (lockVersion !== packageVersion) {
    errors.push('package-lock.json version must match package.json version.');
  }

  if (lockRootVersion !== packageVersion) {
    errors.push('package-lock.json packages[""].version must match package.json version.');
  }

  return errors;
}

function readJsonFromGit(ref, filePath) {
  const content = execFileSync('git', ['show', `${ref}:${filePath}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(content);
}

function readVersionSet(ref) {
  const packageJson = readJsonFromGit(ref, 'package.json');
  const packageLock = readJsonFromGit(ref, 'package-lock.json');

  return {
    packageVersion: packageJson.version,
    lockVersion: packageLock.version,
    lockRootVersion: packageLock.packages?.['']?.version,
  };
}

export function checkVersionBump(baseVersions, headVersions) {
  const errors = [
    ...validatePackageVersions(baseVersions).map((error) => `Base ${error}`),
    ...validatePackageVersions(headVersions).map((error) => `Head ${error}`),
  ];

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  let bumpResult;
  try {
    parseAppVersion(headVersions.packageVersion);
    bumpResult = validateVersionBump(baseVersions.packageVersion, headVersions.packageVersion);
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }

  if (!bumpResult.valid) {
    return {
      valid: false,
      errors: [
        `Version must change from ${baseVersions.packageVersion} to one of: ${bumpResult.allowed.join(', ')}.`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

function runCli() {
  const [baseRef = 'origin/main', headRef = 'HEAD'] = process.argv.slice(2);
  const result = checkVersionBump(readVersionSet(baseRef), readVersionSet(headRef));

  if (!result.valid) {
    console.error('Version bump check failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Version bump check passed.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
