import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGroceryItems } from "@/hooks/use-grocery-items";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getCachedGroceryItems } from "@/lib/offline-grocery-cache";
import { enqueueGroceryMutation } from "@/lib/offline-grocery-queue";
import type { GroceryItem } from "@shared/schema";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedApiRequest = vi.mocked(apiRequest);

function groceryItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: 1,
    name: "Melk",
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: "user-1",
    familyId: "family-1",
    addedAt: new Date("2026-06-18T10:00:00.000Z"),
    sortOrder: 0,
    createdAt: new Date("2026-06-18T10:00:00.000Z"),
    ...overrides,
  };
}

describe("useGroceryItems", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    mockedUseQuery.mockReturnValue({
      data: { items: [], isOfflineData: false },
      isLoading: false,
      refetch: vi.fn(),
    } as any);
  });

  it("calls useQuery with the grocery items endpoint and family id", () => {
    renderHook(() => useGroceryItems("family-1"));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["/api/grocery-items", "family-1"],
        enabled: true,
      }),
    );
  });

  it("disables the query when no family id is provided", () => {
    renderHook(() => useGroceryItems(null));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["/api/grocery-items", null],
        enabled: false,
      }),
    );
  });

  it("opts the query in to window-focus refetch", () => {
    renderHook(() => useGroceryItems("family-1"));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchOnWindowFocus: "always",
      }),
    );
  });

  it("returns an empty array when the family id is missing", async () => {
    renderHook(() => useGroceryItems(null));

    const queryFn = mockedUseQuery.mock.calls[0][0]
      .queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(Array.from(result as unknown[])).toEqual([]);
  });

  it("returns the grocery items array from query data", () => {
    mockedUseQuery.mockReturnValue({
      data: [groceryItem()],
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useGroceryItems("family-1"));

    expect(result.current.data).toEqual([groceryItem()]);
    expect(result.current.isOfflineData).toBe(false);
  });

  it("caches successful network responses per family", async () => {
    const items = [groceryItem({ name: "Brood" })];
    mockedApiRequest.mockResolvedValue({
      json: vi.fn().mockResolvedValue(items),
    } as any);

    renderHook(() => useGroceryItems("family-1"));

    const queryFn = mockedUseQuery.mock.calls[0][0]
      .queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(Array.from(result as unknown[])).toEqual(items);
    expect(getCachedGroceryItems("family-1")).toEqual(items);
  });

  it("keeps queued offline changes visible after a successful fetch", async () => {
    const items = [groceryItem({ id: 1, name: "Melk", completed: false })];
    mockedApiRequest.mockResolvedValue({
      json: vi.fn().mockResolvedValue(items),
    } as any);
    enqueueGroceryMutation("family-1", {
      type: "toggle",
      payload: { id: 1, completed: true },
    });

    renderHook(() => useGroceryItems("family-1"));

    const queryFn = mockedUseQuery.mock.calls[0][0]
      .queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(Array.from(result as unknown[])).toEqual([
      groceryItem({ id: 1, name: "Melk", completed: true }),
    ]);
    expect(getCachedGroceryItems("family-1")).toEqual(items);
  });

  it("returns cached items when the network request fails", async () => {
    const cached = [groceryItem({ name: "Appels" })];
    localStorage.setItem(
      "grocery-items-cache:v1:family-1",
      JSON.stringify(cached),
    );
    mockedApiRequest.mockRejectedValue(new Error("offline"));

    renderHook(() => useGroceryItems("family-1"));

    const queryFn = mockedUseQuery.mock.calls[0][0]
      .queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(Array.from(result as unknown[])).toEqual(cached);
  });

  it("does not expose cached items after an authorization failure", async () => {
    const cached = [groceryItem({ name: "Privé melk" })];
    localStorage.setItem(
      "grocery-items-cache:v1:family-1",
      JSON.stringify(cached),
    );
    mockedApiRequest.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));

    renderHook(() => useGroceryItems("family-1"));

    const queryFn = mockedUseQuery.mock.calls[0][0]
      .queryFn as () => Promise<unknown>;

    await expect(queryFn()).rejects.toThrow("Unauthorized");
  });

  it("applies queued offline changes to cached items after an offline reload", async () => {
    const cached = [groceryItem({ id: 1, name: "Melk", completed: false })];
    localStorage.setItem(
      "grocery-items-cache:v1:family-1",
      JSON.stringify(cached),
    );
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -123,
        name: "Offline brood",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: false,
      },
    });
    enqueueGroceryMutation("family-1", {
      type: "toggle",
      payload: { id: 1, completed: true },
    });
    mockedApiRequest.mockRejectedValue(new Error("offline"));

    renderHook(() => useGroceryItems("family-1"));

    const queryFn = mockedUseQuery.mock.calls[0][0]
      .queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(Array.from(result as unknown[])).toEqual([
      groceryItem({ id: 1, name: "Melk", completed: true }),
      expect.objectContaining({
        id: -123,
        name: "Offline brood",
        completed: false,
      }),
    ]);
  });
});
