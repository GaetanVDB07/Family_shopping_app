function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Dutch-friendly label for when an item was last put on the list. */
export function formatAddedAt(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const valueDay = startOfDay(value);
  const today = startOfDay(now);
  const yesterday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  if (valueDay.getTime() === today.getTime()) {
    return "vandaag";
  }
  if (valueDay.getTime() === yesterday.getTime()) {
    return "gisteren";
  }

  return value.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}
