import { describe, expect, it, vi } from "vitest";
import {
  getApiErrorMessage,
  maxLengthMessage,
  notifyMaxLengthLimit,
  parseApiErrorBody,
  toastApiError,
  VALIDATION_ERROR_TOAST_DURATION,
} from "../client/src/lib/api-error";

describe("parseApiErrorBody", () => {
  it("extracts message from JSON error bodies", () => {
    expect(parseApiErrorBody('{"message":"Maximaal 200 tekens toegestaan"}')).toBe(
      "Maximaal 200 tekens toegestaan",
    );
  });

  it("returns plain text when the body is not JSON", () => {
    expect(parseApiErrorBody("Server unavailable")).toBe("Server unavailable");
  });
});

describe("getApiErrorMessage", () => {
  it("returns the error message when present", () => {
    expect(getApiErrorMessage(new Error("Maximaal 200 tekens toegestaan"), "fallback")).toBe(
      "Maximaal 200 tekens toegestaan",
    );
  });

  it("falls back for unknown errors", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });
});

describe("maxLengthMessage", () => {
  it("uses Dutch copy matching server validation", () => {
    expect(maxLengthMessage(200)).toBe("Maximaal 200 tekens toegestaan");
  });
});

describe("toastApiError", () => {
  it("shows parsed API messages for a short duration", () => {
    const toast = vi.fn();
    toastApiError(toast, new Error("Maximaal 200 tekens toegestaan"), "fallback");

    expect(toast).toHaveBeenCalledWith({
      title: "Fout",
      description: "Maximaal 200 tekens toegestaan",
      variant: "destructive",
      duration: VALIDATION_ERROR_TOAST_DURATION,
    });
  });
});

describe("notifyMaxLengthLimit", () => {
  it("debounces repeated max-length toasts", () => {
    vi.useFakeTimers();
    const toast = vi.fn();

    notifyMaxLengthLimit(toast, 100);
    notifyMaxLengthLimit(toast, 100);

    expect(toast).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
