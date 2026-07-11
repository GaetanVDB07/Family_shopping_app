import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFamilyStatus } from "@/hooks/use-family-status";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isSuccess: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe("useFamilyStatus readiness", () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      session: { access_token: "token" },
    });
    mocks.useQuery.mockReturnValue(queryResult());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps family data pending while an authenticated user is waiting for a session", () => {
    mocks.useAuth.mockReturnValue({ user: { id: "user-1" }, session: null });

    const { result } = renderHook(() => useFamilyStatus());

    expect(result.current.familiesLoading).toBe(true);
    expect(result.current.familyDataReady).toBe(false);
    expect(result.current.hasFamilies).toBe(false);
  });

  it("distinguishes a successful empty family list from data that is not ready", () => {
    mocks.useQuery.mockReturnValue(queryResult({ data: [], isSuccess: true }));

    const { result } = renderHook(() => useFamilyStatus());

    expect(result.current.familiesLoading).toBe(false);
    expect(result.current.familyDataReady).toBe(true);
    expect(result.current.familyError).toBeNull();
    expect(result.current.hasFamilies).toBe(false);
  });

  it("does not treat a family request error as an empty family list", () => {
    mocks.useQuery.mockReturnValue(
      queryResult({ error: new Error("Families konden niet worden opgehaald") }),
    );

    const { result } = renderHook(() => useFamilyStatus());

    expect(result.current.familyDataReady).toBe(false);
    expect(result.current.familyError).toBe("Families konden niet worden opgehaald");
  });

  it("rejects an unauthorized family response instead of returning an empty list", async () => {
    let queryOptions: { queryFn: () => Promise<unknown> } | undefined;
    mocks.useQuery.mockImplementation((options) => {
      queryOptions = options;
      return queryResult();
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    renderHook(() => useFamilyStatus());

    await expect(queryOptions?.queryFn()).rejects.toThrow(
      "Je sessie kon niet worden gecontroleerd",
    );
  });
});
