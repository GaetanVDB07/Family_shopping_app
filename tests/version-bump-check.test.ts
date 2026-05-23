import { describe, expect, it } from 'vitest';
import {
  checkFeatureVersionBump,
  checkReleaseVersion,
  compareAppVersions,
  getAllowedVersionBumps,
  parseAppVersion,
  validatePackageVersions,
  validateVersionBump,
} from '../scripts/check-version-bump.mjs';

const syncedVersions = (version) => ({
  packageVersion: version,
  lockVersion: version,
  lockRootVersion: version,
});

describe('version bump check', () => {
  it('allows bugfixes and features to increment the third number', () => {
    expect(validateVersionBump('1.1.1', '1.1.2')).toEqual({
      valid: true,
      allowed: ['1.1.2', '1.2.0', '2.0.0'],
    });
  });

  it('allows the second number to increment for breaking releases', () => {
    expect(validateVersionBump('1.1.4', '1.2.0')).toEqual({
      valid: true,
      allowed: ['1.1.5', '1.2.0', '2.0.0'],
    });
  });

  it('requires the second number to increment when the third number is already 9', () => {
    expect(getAllowedVersionBumps('1.1.9')).toEqual(['1.2.0', '2.0.0']);
    expect(validateVersionBump('1.1.9', '1.1.10').valid).toBe(false);
  });

  it('rejects unchanged, skipped, or malformed versions', () => {
    expect(validateVersionBump('1.1.1', '1.1.1').valid).toBe(false);
    expect(validateVersionBump('1.1.1', '1.1.3').valid).toBe(false);
    expect(() => parseAppVersion('1.1')).toThrow('Invalid app version');
  });

  it('requires package-lock to match package versions', () => {
    expect(
      validatePackageVersions({
        packageVersion: '1.1.2',
        lockVersion: '1.1.2',
        lockRootVersion: '1.1.2',
      })
    ).toEqual([]);

    expect(
      validatePackageVersions({
        packageVersion: '1.1.2',
        lockVersion: '1.1.1',
        lockRootVersion: '1.1.2',
      })
    ).toContain('package-lock.json version must match package.json version.');
  });

  it('requires a feature merge into develop to bump the version', () => {
    expect(
      checkFeatureVersionBump(syncedVersions('1.1.2'), syncedVersions('1.1.3'))
    ).toEqual({ valid: true, errors: [] });

    expect(
      checkFeatureVersionBump(syncedVersions('1.1.2'), syncedVersions('1.1.2')).valid
    ).toBe(false);
  });

  it('requires a release merge into main to be ahead of production', () => {
    expect(
      checkReleaseVersion(syncedVersions('1.1.2'), syncedVersions('1.1.5'))
    ).toEqual({ valid: true, errors: [] });

    expect(
      checkReleaseVersion(syncedVersions('1.1.5'), syncedVersions('1.1.5')).valid
    ).toBe(false);
  });

  it('compares custom app versions in order', () => {
    expect(compareAppVersions('1.1.3', '1.1.2')).toBe(1);
    expect(compareAppVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareAppVersions('1.1.2', '1.1.2')).toBe(0);
  });
});
