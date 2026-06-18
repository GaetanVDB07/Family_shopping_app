import type { GroceryItem } from "@shared/schema";

const CACHE_PREFIX = "grocery-items-cache:v1:";

function cacheKey(familyId: string): string {
  return `${CACHE_PREFIX}${familyId}`;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCachedItem(value: unknown): GroceryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const addedAt = parseDate(item.addedAt);
  const createdAt = parseDate(item.createdAt);

  if (
    typeof item.id !== "number" ||
    typeof item.name !== "string" ||
    typeof item.completed !== "boolean" ||
    typeof item.addedBy !== "string" ||
    typeof item.familyId !== "string" ||
    !addedAt ||
    !createdAt
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    quantity: typeof item.quantity === "string" ? item.quantity : null,
    unit: typeof item.unit === "string" ? item.unit : null,
    notes: typeof item.notes === "string" ? item.notes : null,
    completed: item.completed,
    addedBy: item.addedBy,
    familyId: item.familyId,
    addedAt,
    createdAt,
  };
}

export function getCachedGroceryItems(familyId: string): GroceryItem[] | null {
  const raw = localStorage.getItem(cacheKey(familyId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const items = parsed.map(parseCachedItem);
    if (items.some((item) => item === null)) {
      return null;
    }

    return items as GroceryItem[];
  } catch {
    return null;
  }
}

export function setCachedGroceryItems(
  familyId: string,
  items: GroceryItem[],
): void {
  localStorage.setItem(cacheKey(familyId), JSON.stringify(items));
}
