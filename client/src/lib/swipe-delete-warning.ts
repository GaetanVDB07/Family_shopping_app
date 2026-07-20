export const SWIPE_DELETE_WARNING_INTERVAL_MS = 60 * 60 * 1000;

function storageKey(userId: string): string {
  return `swipe-delete-warning-shown-at:${userId}`;
}

export function shouldShowSwipeDeleteWarning(userId: string, now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return true;
    }

    const recordedAt = Number(raw);
    if (!Number.isFinite(recordedAt)) {
      return true;
    }

    return now - recordedAt >= SWIPE_DELETE_WARNING_INTERVAL_MS;
  } catch {
    // localStorage unavailable (private mode, storage denied): fail safe and warn.
    return true;
  }
}

export function recordSwipeDeleteWarningShown(userId: string, now: number = Date.now()): void {
  try {
    localStorage.setItem(storageKey(userId), String(now));
  } catch {
    // localStorage unavailable: nothing to persist, next swipe warns again.
  }
}
