import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroceryItem } from "@shared/schema";
import { useOfflineGrocerySync } from "@/hooks/use-offline-grocery-sync";
import { getQueuedGroceryMutations } from "@/lib/offline-grocery-queue";

const setQueryData = vi.fn();
const mockCacheItems: GroceryItem[] = [];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData,
    }),
  };
});

const apiRequest = vi.fn();

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

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
    createdAt: new Date("2026-06-18T10:00:00.000Z"),
    ...overrides,
  };
}

describe("useOfflineGrocerySync", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCacheItems.length = 0;
    setQueryData.mockImplementation((queryKey, updater) => {
      const next = typeof updater === "function" ? updater(mockCacheItems) : updater;
      mockCacheItems.splice(0, mockCacheItems.length, ...(next ?? []));
      (mockCacheItems as typeof mockCacheItems & { isOfflineData?: boolean }).isOfflineData = next?.isOfflineData;
    });
    apiRequest.mockReset();
  });

  it("queues an offline add and updates the grocery cache", () => {
    const { result } = renderHook(() =>
      useOfflineGrocerySync({
        familyId: "family-1",
        isOnline: false,
        isOfflineData: false,
        refetch: vi.fn(),
        userId: "user-1",
        userLabel: "Tester",
      }),
    );

    act(() => {
      expect(result.current.queueAddItem("Offline melk", { quantity: "2" })).toBe(true);
    });

    expect(Array.from(mockCacheItems)).toEqual([
      expect.objectContaining({ name: "Offline melk", quantity: "2", addedBy: "Tester" }),
    ]);
    expect(getQueuedGroceryMutations("family-1")).toEqual([
      expect.objectContaining({ type: "add", payload: expect.objectContaining({ name: "Offline melk" }) }),
    ]);
  });

  it("updates a queued temporary add when toggled offline", () => {
    const { result } = renderHook(() =>
      useOfflineGrocerySync({
        familyId: "family-1",
        isOnline: false,
        isOfflineData: false,
        refetch: vi.fn(),
        userId: "user-1",
        userLabel: "Tester",
      }),
    );

    act(() => {
      result.current.queueAddItem("Offline melk");
    });
    const tempItem = mockCacheItems[0];

    act(() => {
      expect(result.current.queueToggleItem(tempItem)).toBe(true);
    });

    expect(getQueuedGroceryMutations("family-1")).toEqual([
      expect.objectContaining({
        type: "add",
        payload: expect.objectContaining({ tempId: tempItem.id, completed: true }),
      }),
    ]);
  });

  it("queues when cached data is visible even if navigator reports online", () => {
    Object.assign(mockCacheItems, { isOfflineData: true });
    const { result } = renderHook(() =>
      useOfflineGrocerySync({
        familyId: "family-1",
        isOnline: true,
        isOfflineData: true,
        refetch: vi.fn(),
        userId: "user-1",
        userLabel: "Tester",
      }),
    );

    act(() => {
      expect(result.current.queueAddItem("Cached mode melk")).toBe(true);
    });

    expect(getQueuedGroceryMutations("family-1")).toEqual([
      expect.objectContaining({
        type: "add",
        payload: expect.objectContaining({ name: "Cached mode melk" }),
      }),
    ]);
    expect((mockCacheItems as typeof mockCacheItems & { isOfflineData?: boolean }).isOfflineData).toBe(true);
  });

  it("clears syncing state and refetches after replay completes", async () => {
    apiRequest.mockResolvedValue({ json: vi.fn().mockResolvedValue({ id: 12 }) });
    const refetch = vi.fn();
    localStorage.setItem(
      "grocery-mutation-queue:v1:family-1",
      JSON.stringify([
        {
          clientMutationId: "mutation-1",
          familyId: "family-1",
          createdAt: "2026-06-18T10:00:00.000Z",
          attempts: 0,
          type: "toggle",
          payload: { id: 7, completed: true },
        },
      ]),
    );

    const { result } = renderHook(() =>
      useOfflineGrocerySync({
        familyId: "family-1",
        isOnline: true,
        isOfflineData: false,
        refetch,
        userId: "user-1",
        userLabel: "Tester",
      }),
    );

    await waitFor(() => {
      expect(result.current.isSyncingQueuedChanges).toBe(false);
      expect(result.current.queuedMutationCount).toBe(0);
      expect(refetch).toHaveBeenCalled();
    });
  });
});
