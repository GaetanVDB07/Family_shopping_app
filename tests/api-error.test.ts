import { describe, expect, it } from "vitest";
import { getApiErrorMessage, parseApiErrorBody } from "../client/src/lib/api-error";

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
