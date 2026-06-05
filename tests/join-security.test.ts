import { afterEach, describe, expect, it } from "vitest";
import {
  checkJoinRateLimit,
  generateFamilyCode,
  isValidFamilyCode,
  normalizeFamilyCode,
  resetJoinRateLimitState,
} from "../shared/join-security.js";

afterEach(() => {
  resetJoinRateLimitState();
});

describe("generateFamilyCode", () => {
  it("returns a 6-digit numeric code", () => {
    const code = generateFamilyCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(Number(code)).toBeGreaterThanOrEqual(100000);
    expect(Number(code)).toBeLessThan(1_000_000);
  });
});

describe("family code validation", () => {
  it("accepts valid 6-digit codes", () => {
    expect(isValidFamilyCode("123456")).toBe(true);
    expect(normalizeFamilyCode(" 654321 ")).toBe("654321");
  });

  it("rejects invalid codes", () => {
    expect(isValidFamilyCode("ABC123")).toBe(false);
    expect(isValidFamilyCode("12345")).toBe(false);
    expect(normalizeFamilyCode("ABC123")).toBeNull();
  });
});

describe("checkJoinRateLimit", () => {
  it("allows attempts within the limit", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(checkJoinRateLimit("user-1", 1_000 + i).allowed).toBe(true);
    }
  });

  it("blocks attempts over the limit", () => {
    for (let i = 0; i < 20; i += 1) {
      checkJoinRateLimit("user-2", 5_000 + i);
    }

    const blocked = checkJoinRateLimit("user-2", 5_020);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
    }
  });
});
