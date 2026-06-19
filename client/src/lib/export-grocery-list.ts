import type { GroceryItem } from "@shared/schema";

function formatItemLine(item: GroceryItem): string {
  const quantityParts = [item.quantity?.trim(), item.unit?.trim()].filter(Boolean);
  const quantitySuffix =
    quantityParts.length > 0 ? ` (${quantityParts.join(" ")})` : "";

  return `- ${item.name.trim()}${quantitySuffix}`;
}

export function formatGroceryListForExport(
  items: GroceryItem[],
  familyName?: string,
): string {
  const pending = items
    .filter((item) => !item.completed && item.name.trim().length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "nl"));

  const title = familyName?.trim()
    ? `Boodschappenlijst (${familyName.trim()}):`
    : "Boodschappenlijst:";

  if (pending.length === 0) {
    return `${title}\n\n(geen openstaande items)`;
  }

  return [title, "", ...pending.map(formatItemLine)].join("\n");
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
