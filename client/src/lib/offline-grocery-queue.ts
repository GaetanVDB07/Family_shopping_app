import type { GroceryItem, InsertGroceryItem } from "@shared/schema";

const QUEUE_PREFIX = "grocery-mutation-queue:v1:";

export type OfflineGroceryMutationInput =
  | {
      type: "add";
      payload: Pick<
        InsertGroceryItem,
        "name" | "quantity" | "unit" | "notes" | "addedBy"
      > & { tempId: number; completed: boolean };
    }
  | {
      type: "toggle";
      payload: { id: number; completed: boolean };
    }
  | {
      type: "edit";
      payload: {
        id: number;
        updates: Pick<GroceryItem, "name" | "quantity" | "unit" | "notes">;
      };
    }
  | {
      type: "delete";
      payload: { id: number };
    };

export type OfflineGroceryMutation = OfflineGroceryMutationInput & {
  clientMutationId: string;
  familyId: string;
  createdAt: string;
  attempts: number;
};

export interface ReplayResult {
  replayed: number;
  remaining: number;
  failed: boolean;
}

type ApiRequestFn = (
  method: string,
  url: string,
  data?: unknown,
) => Promise<unknown>;

class ReplayMutationError extends Error {
  replacement?: OfflineGroceryMutation;

  constructor(error: unknown, replacement?: OfflineGroceryMutation) {
    super(error instanceof Error ? error.message : "Failed to replay queued mutation");
    this.replacement = replacement;
  }
}

function queueKey(familyId: string): string {
  return `${QUEUE_PREFIX}${familyId}`;
}

function createMutationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isQueuedMutation(value: unknown): value is OfflineGroceryMutation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const mutation = value as Partial<OfflineGroceryMutation>;
  return (
    typeof mutation.clientMutationId === "string" &&
    typeof mutation.familyId === "string" &&
    typeof mutation.createdAt === "string" &&
    typeof mutation.attempts === "number" &&
    (mutation.type === "add" ||
      mutation.type === "toggle" ||
      mutation.type === "edit" ||
      mutation.type === "delete") &&
    typeof mutation.payload === "object" &&
    mutation.payload !== null
  );
}

export function getQueuedGroceryMutations(
  familyId: string,
): OfflineGroceryMutation[] {
  const raw = localStorage.getItem(queueKey(familyId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isQueuedMutation);
  } catch {
    return [];
  }
}

function setQueuedGroceryMutations(
  familyId: string,
  mutations: OfflineGroceryMutation[],
): void {
  if (mutations.length === 0) {
    localStorage.removeItem(queueKey(familyId));
    return;
  }

  localStorage.setItem(queueKey(familyId), JSON.stringify(mutations));
}

export function enqueueGroceryMutation(
  familyId: string,
  input: OfflineGroceryMutationInput,
): OfflineGroceryMutation {
  const mutation: OfflineGroceryMutation = {
    ...input,
    clientMutationId: createMutationId(),
    familyId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  setQueuedGroceryMutations(familyId, [
    ...getQueuedGroceryMutations(familyId),
    mutation,
  ]);
  return mutation;
}

export function updateQueuedAddMutation(
  familyId: string,
  tempId: number,
  updates: Partial<Extract<OfflineGroceryMutationInput, { type: "add" }>["payload"]>,
): boolean {
  let updated = false;
  const queue = getQueuedGroceryMutations(familyId).map((mutation) => {
    if (mutation.type !== "add" || mutation.payload.tempId !== tempId) {
      return mutation;
    }

    updated = true;
    return {
      ...mutation,
      payload: {
        ...mutation.payload,
        ...updates,
      },
    };
  });

  if (updated) {
    setQueuedGroceryMutations(familyId, queue);
  }

  return updated;
}

export function removeQueuedAddMutation(familyId: string, tempId: number): boolean {
  const queue = getQueuedGroceryMutations(familyId);
  const filtered = queue.filter((mutation) => mutation.type !== "add" || mutation.payload.tempId !== tempId);

  if (filtered.length === queue.length) {
    return false;
  }

  setQueuedGroceryMutations(familyId, filtered);
  return true;
}

async function replayMutation(
  mutation: OfflineGroceryMutation,
  apiRequest: ApiRequestFn,
): Promise<void> {
  if (mutation.type === "add") {
    const { completed, tempId, ...payload } = mutation.payload;
    const response = await apiRequest("POST", "/api/grocery-items", {
      ...payload,
      familyId: mutation.familyId,
    });

    if (completed) {
      const createdItem = await (response as Response).json?.();
      if (typeof createdItem?.id === "number") {
        try {
          await apiRequest("PATCH", `/api/grocery-items/${createdItem.id}`, {
            completed: true,
            familyId: mutation.familyId,
          });
        } catch (error) {
          throw new ReplayMutationError(error, {
            type: "toggle",
            payload: { id: createdItem.id, completed: true },
            clientMutationId: mutation.clientMutationId,
            familyId: mutation.familyId,
            createdAt: mutation.createdAt,
            attempts: mutation.attempts + 1,
          });
        }
      }
    }

    return;
  }

  if (mutation.type === "toggle") {
    await apiRequest("PATCH", `/api/grocery-items/${mutation.payload.id}`, {
      completed: mutation.payload.completed,
      familyId: mutation.familyId,
    });
    return;
  }

  if (mutation.type === "edit") {
    await apiRequest("PATCH", `/api/grocery-items/${mutation.payload.id}`, {
      ...mutation.payload.updates,
      familyId: mutation.familyId,
    });
    return;
  }

  const familyQuery = `?familyId=${encodeURIComponent(mutation.familyId)}`;
  await apiRequest(
    "DELETE",
    `/api/grocery-items/${mutation.payload.id}${familyQuery}`,
  );
}

export async function replayGroceryMutationQueue(
  familyId: string,
  apiRequest: ApiRequestFn,
): Promise<ReplayResult> {
  const queue = getQueuedGroceryMutations(familyId);
  let replayed = 0;

  for (const mutation of queue) {
    try {
      await replayMutation(mutation, apiRequest);
      replayed += 1;
    } catch (error) {
      const replacement = error instanceof ReplayMutationError ? error.replacement : undefined;
      const remaining = replacement
        ? [replacement, ...queue.slice(replayed + 1)]
        : queue
            .slice(replayed)
            .map((entry, index) =>
              index === 0 ? { ...entry, attempts: entry.attempts + 1 } : entry,
            );
      setQueuedGroceryMutations(familyId, remaining);
      return { replayed, remaining: remaining.length, failed: true };
    }
  }

  setQueuedGroceryMutations(familyId, []);
  return { replayed, remaining: 0, failed: false };
}
