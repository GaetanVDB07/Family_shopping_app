import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueGroceryMutation,
  getQueuedGroceryMutations,
  replayGroceryMutationQueue,
  removeQueuedAddMutation,
  updateQueuedAddMutation,
} from "@/lib/offline-grocery-queue";

describe("offline grocery queue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores queued mutations per family in insertion order", () => {
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: false,
      },
    });
    enqueueGroceryMutation("family-1", {
      type: "toggle",
      payload: { id: 12, completed: true },
    });
    enqueueGroceryMutation("family-2", {
      type: "delete",
      payload: { id: 8 },
    });

    expect(
      getQueuedGroceryMutations("family-1").map((entry) => entry.type),
    ).toEqual(["add", "toggle"]);
    expect(
      getQueuedGroceryMutations("family-2").map((entry) => entry.type),
    ).toEqual(["delete"]);
  });

  it("replays queued mutations in order and clears successful entries", async () => {
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: false,
      },
    });
    enqueueGroceryMutation("family-1", {
      type: "toggle",
      payload: { id: 12, completed: true },
    });

    const apiRequest = vi.fn().mockResolvedValue({ json: vi.fn() });

    const result = await replayGroceryMutationQueue("family-1", apiRequest);

    expect(result).toEqual({ replayed: 2, remaining: 0, failed: false });
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/grocery-items",
      {
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        familyId: "family-1",
      },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "PATCH",
      "/api/grocery-items/12",
      {
        completed: true,
        familyId: "family-1",
      },
    );
    expect(getQueuedGroceryMutations("family-1")).toEqual([]);
  });

  it("patches a newly created item when the queued add is completed", async () => {
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: true,
      },
    });

    const apiRequest = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ id: 99 }),
    });

    await replayGroceryMutationQueue("family-1", apiRequest);

    expect(apiRequest).toHaveBeenNthCalledWith(1, "POST", "/api/grocery-items", {
      name: "Melk",
      quantity: null,
      unit: null,
      notes: null,
      addedBy: "user-1",
      familyId: "family-1",
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "PATCH", "/api/grocery-items/99", {
      completed: true,
      familyId: "family-1",
    });
  });

  it("replaces a completed queued add with a toggle when create succeeds but patch fails", async () => {
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: true,
      },
    });

    const apiRequest = vi
      .fn()
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ id: 99 }) })
      .mockRejectedValueOnce(new Error("patch failed"));

    const result = await replayGroceryMutationQueue("family-1", apiRequest);

    expect(result).toEqual({ replayed: 0, remaining: 1, failed: true });
    expect(getQueuedGroceryMutations("family-1")).toEqual([
      expect.objectContaining({
        type: "toggle",
        payload: { id: 99, completed: true },
      }),
    ]);
  });

  it("keeps failed and later mutations queued", async () => {
    enqueueGroceryMutation("family-1", {
      type: "toggle",
      payload: { id: 12, completed: true },
    });
    enqueueGroceryMutation("family-1", {
      type: "delete",
      payload: { id: 13 },
    });

    const apiRequest = vi.fn().mockRejectedValue(new Error("offline"));

    const result = await replayGroceryMutationQueue("family-1", apiRequest);

    expect(result).toEqual({ replayed: 0, remaining: 2, failed: true });
    expect(
      getQueuedGroceryMutations("family-1").map((entry) => entry.type),
    ).toEqual(["toggle", "delete"]);
  });

  it("updates a queued add instead of creating operations for temporary item ids", () => {
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -123,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: false,
      },
    });

    expect(
      updateQueuedAddMutation("family-1", -123, {
        name: "Halfvolle melk",
        completed: true,
      }),
    ).toBe(true);

    expect(getQueuedGroceryMutations("family-1")).toEqual([
      expect.objectContaining({
        type: "add",
        payload: expect.objectContaining({
          tempId: -123,
          name: "Halfvolle melk",
          completed: true,
        }),
      }),
    ]);
  });

  it("removes a queued add when a temporary offline item is deleted before sync", () => {
    enqueueGroceryMutation("family-1", {
      type: "add",
      payload: {
        tempId: -123,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        addedBy: "user-1",
        completed: false,
      },
    });

    expect(removeQueuedAddMutation("family-1", -123)).toBe(true);

    expect(getQueuedGroceryMutations("family-1")).toEqual([]);
  });
});
