import type { GroceryItem } from "@shared/schema";

type GroceryItemsWithOfflineFlag = GroceryItem[] & { isOfflineData?: boolean };

const AUTH_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeAuthUserId(value: string): boolean {
  return AUTH_USER_ID_PATTERN.test(value);
}

export function resolveAddedByDisplayName(
  addedBy: string,
  nameByUserId: Map<string, string>,
): string {
  if (!looksLikeAuthUserId(addedBy)) {
    return addedBy;
  }

  return nameByUserId.get(addedBy) ?? addedBy;
}

export function buildFamilyMemberNameMap(
  members: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
  }>,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const member of members) {
    const displayName =
      member.userName?.trim() ||
      member.userEmail.split("@")[0]?.trim() ||
      "Onbekend";
    map.set(member.userId, displayName);
  }

  return map;
}

export function applyMemberNamesToGroceryItems(
  items: GroceryItemsWithOfflineFlag,
  nameByUserId: Map<string, string>,
): GroceryItemsWithOfflineFlag {
  if (nameByUserId.size === 0) {
    return items;
  }

  let changed = false;
  const next = items.map((item) => {
    const resolvedAddedBy = resolveAddedByDisplayName(item.addedBy, nameByUserId);
    if (resolvedAddedBy === item.addedBy) {
      return item;
    }

    changed = true;
    return { ...item, addedBy: resolvedAddedBy };
  });

  return changed ? Object.assign(next, { isOfflineData: items.isOfflineData }) : items;
}
