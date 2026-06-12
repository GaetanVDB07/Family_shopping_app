import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  buildFamilyInviteUrl,
  captureInviteCodeFromUrl,
  parseJoinCodeFromSearch,
  PENDING_JOIN_CODE_KEY,
  readPendingJoinCode,
  resolveInitialJoinCode,
  storePendingJoinCode,
  clearPendingJoinCode,
} from '@/lib/family-invite';

describe('family invite helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('builds a family-setup deep link with the join code', () => {
    expect(buildFamilyInviteUrl('123456', 'https://example.com')).toBe(
      'https://example.com/family-setup?code=123456',
    );
  });

  it('parses and normalizes ?code= from search params', () => {
    expect(parseJoinCodeFromSearch('?code=12ab3456')).toBe('123456');
    expect(parseJoinCodeFromSearch('?code=12345')).toBeNull();
  });

  it('persists pending join codes in sessionStorage', () => {
    storePendingJoinCode('654321');
    expect(readPendingJoinCode()).toBe('654321');
    clearPendingJoinCode();
    expect(sessionStorage.getItem(PENDING_JOIN_CODE_KEY)).toBeNull();
  });

  it('prefers URL code over stored pending code', () => {
    storePendingJoinCode('111111');
    expect(resolveInitialJoinCode('?code=222222')).toBe('222222');
  });
});

describe('captureInviteCodeFromUrl', () => {
  const replaceState = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    replaceState.mockReset();
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.com/family-setup?code=123456',
        search: '?code=123456',
        pathname: '/family-setup',
        hash: '',
      },
      history: { replaceState },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stores code and removes it from the address bar', () => {
    expect(captureInviteCodeFromUrl()).toBe('123456');
    expect(readPendingJoinCode()).toBe('123456');
    expect(replaceState).toHaveBeenCalledWith({}, '', '/family-setup');
  });
});
