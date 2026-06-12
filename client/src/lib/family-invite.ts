import { isValidJoinCode, normalizeJoinCodeInput } from '@/lib/family-code';

export const PENDING_JOIN_CODE_KEY = 'pendingFamilyJoinCode';

export function parseJoinCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get('code');
  if (!raw) {
    return null;
  }

  const normalized = normalizeJoinCodeInput(raw);
  return isValidJoinCode(normalized) ? normalized : null;
}

export function storePendingJoinCode(code: string): void {
  sessionStorage.setItem(PENDING_JOIN_CODE_KEY, normalizeJoinCodeInput(code));
}

export function readPendingJoinCode(): string | null {
  const stored = sessionStorage.getItem(PENDING_JOIN_CODE_KEY);
  if (!stored) {
    return null;
  }

  const normalized = normalizeJoinCodeInput(stored);
  return isValidJoinCode(normalized) ? normalized : null;
}

export function clearPendingJoinCode(): void {
  sessionStorage.removeItem(PENDING_JOIN_CODE_KEY);
}

/** Prefer URL ?code=, then sessionStorage (survives login redirect). */
export function resolveInitialJoinCode(search = window.location.search): string | null {
  return parseJoinCodeFromSearch(search) ?? readPendingJoinCode();
}

export function buildFamilyInviteUrl(code: string, origin = window.location.origin): string {
  const normalized = normalizeJoinCodeInput(code);
  return `${origin}/family-setup?code=${normalized}`;
}

export function captureInviteCodeFromUrl(): string | null {
  const code = parseJoinCodeFromSearch(window.location.search);
  if (!code) {
    return null;
  }

  storePendingJoinCode(code);

  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);

  return code;
}
