import { randomInt } from "node:crypto";

const FAMILY_CODE_PATTERN = /^\d{6}$/;
const JOIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const JOIN_RATE_MAX_ATTEMPTS = 20;

const joinRateLimitState = new Map();

export function generateFamilyCode() {
  return randomInt(100000, 1_000_000).toString();
}

export function isValidFamilyCode(code) {
  return typeof code === "string" && FAMILY_CODE_PATTERN.test(code.trim());
}

export function normalizeFamilyCode(code) {
  if (typeof code !== "string") {
    return null;
  }

  const trimmed = code.trim();
  return FAMILY_CODE_PATTERN.test(trimmed) ? trimmed : null;
}

export function checkJoinRateLimit(userId, now = Date.now()) {
  let entry = joinRateLimitState.get(userId);

  if (!entry || now - entry.startedAt > JOIN_RATE_WINDOW_MS) {
    entry = { count: 0, startedAt: now };
  }

  entry.count += 1;
  joinRateLimitState.set(userId, entry);

  if (entry.count > JOIN_RATE_MAX_ATTEMPTS) {
    const retryAfterMs = JOIN_RATE_WINDOW_MS - (now - entry.startedAt);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  return { allowed: true };
}

export function resetJoinRateLimitState() {
  joinRateLimitState.clear();
}
