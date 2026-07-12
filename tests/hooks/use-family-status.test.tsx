import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFamilyStatus } from "@/hooks/use-family-status";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
  seedBootstrapGroceryItems: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/lib/bootstrap-cache", () => ({
  seedBootstrapGroceryItems: mocks.seedBootstrapGroceryItems,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useQueryClient: mocks.useQueryClient,
}));

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
    mocks.useQueryClient.mockReturnValue({ setQueryData: vi.fn() });
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
    mocks.useQuery.mockReturnValue(queryResult({
      data: { families: [], primaryFamilyId: null, groceryItems: [] },
      isSuccess: true,
    }));

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

  it("loads bootstrap data and seeds the primary grocery-list query", async () => {
    let queryOptions: { queryFn: () => Promise<unknown> } | undefined;
    mocks.useQuery.mockImplementation((options) => {
      queryOptions = options;
      return queryResult();
    });
    const bootstrapData = {
      families: [{ familyId: "family-1" }],
      primaryFamilyId: "family-1",
      groceryItems: [{ id: 1, name: "Melk" }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(bootstrapData),
    }));

    renderHook(() => useFamilyStatus());
    await expect(queryOptions?.queryFn()).resolves.toMatchObject(bootstrapData);

    expect(fetch).toHaveBeenCalledWith(
      "/api/bootstrap",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
    expect(mocks.seedBootstrapGroceryItems).toHaveBeenCalledWith(
      expect.anything(),
      "family-1",
      bootstrapData.groceryItems,
    );
  });
});
