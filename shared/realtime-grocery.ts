import type { GroceryItem } from "./schema";

function parseOptionalTimestamp(value: unknown): Date | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(String(value));
}

/** Map Supabase Realtime row (snake_case) to app GroceryItem (camelCase). */
export function mapRealtimeGroceryRow(row: Record<string, unknown>): GroceryItem {
  const createdAtRaw = row.created_at ?? row.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw
      : new Date(String(createdAtRaw ?? Date.now()));

  const addedAtRaw = row.added_at ?? row.addedAt ?? createdAtRaw;
  const addedAt =
    addedAtRaw instanceof Date
      ? addedAtRaw
      : new Date(String(addedAtRaw ?? Date.now()));

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    quantity: row.quantity == null ? null : String(row.quantity),
    unit: row.unit == null ? null : String(row.unit),
    notes: row.notes == null ? null : String(row.notes),
    completed: Boolean(row.completed),
    addedBy: String(row.added_by ?? row.addedBy ?? ""),
    addedByName:
      row.added_by_name == null && row.addedByName == null
        ? null
        : String(row.added_by_name ?? row.addedByName ?? ""),
    familyId: String(row.family_id ?? row.familyId ?? ""),
    addedAt,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    completedAt: parseOptionalTimestamp(row.completed_at ?? row.completedAt),
    archivedAt: parseOptionalTimestamp(row.archived_at ?? row.archivedAt),
    createdAt,
  };
}
