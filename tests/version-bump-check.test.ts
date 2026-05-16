import { describe, expect, it } from 'vitest';
import {
  getAllowedVersionBumps,
  parseAppVersion,
  validatePackageVersions,
  validateVersionBump,
} from '../scripts/check-main-version-bump.mjs';

describe('main version bump check', () => {
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
});
