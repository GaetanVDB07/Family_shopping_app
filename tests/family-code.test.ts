import { describe, expect, it } from 'vitest';
import { isValidJoinCode, normalizeJoinCodeInput } from '@/lib/family-code';

describe('family join code helpers', () => {
  it('strips non-digits and caps at 6 characters', () => {
    expect(normalizeJoinCodeInput('12ab34cd56')).toBe('123456');
    expect(normalizeJoinCodeInput('ABCD12')).toBe('12');
    expect(normalizeJoinCodeInput('1234567890')).toBe('123456');
  });

  it('accepts only 6-digit numeric codes', () => {
    expect(isValidJoinCode('123456')).toBe(true);
    expect(isValidJoinCode('12345')).toBe(false);
    expect(isValidJoinCode('ABCD12')).toBe(false);
    expect(isValidJoinCode('')).toBe(false);
  });
});
