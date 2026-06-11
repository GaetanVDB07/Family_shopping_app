import { describe, expect, it, vi, afterEach } from "vitest";
import { formatAddedAt } from "../shared/format-added-at";

describe("formatAddedAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns vandaag for today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T15:00:00.000Z"));

    expect(formatAddedAt(new Date("2026-06-11T08:00:00.000Z"))).toBe("vandaag");
  });

  it("returns gisteren for yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T15:00:00.000Z"));

    expect(formatAddedAt(new Date("2026-06-10T20:00:00.000Z"))).toBe("gisteren");
  });

  it("returns a Dutch short date for older items", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T15:00:00.000Z"));

    expect(formatAddedAt(new Date("2026-05-01T12:00:00.000Z"))).toMatch(/1 mei/i);
  });
});
