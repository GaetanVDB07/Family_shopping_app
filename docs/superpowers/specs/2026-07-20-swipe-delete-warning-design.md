# Swipe-delete warning with 60-minute suppression — Design

Date: 2026-07-20
Status: Approved
Branch: `feature/swipe-delete-warning` (from `develop`)

## Problem

On mobile, the trash button on a grocery item is hidden (`hidden sm:inline-flex`), so the
only way to delete an item is a left-swipe gesture. That gesture:

1. Has no visual affordance — users can't discover it.
2. Deletes **immediately with no confirmation and no undo** — one accidental swipe loses
   the item.

## Decisions (from brainstorming)

- **Scope:** warning applies to **swipe-to-delete only**. The desktop trash button is a
  deliberate click and keeps deleting immediately.
- **Approach:** reuse the existing (currently unused) `DeleteConfirmationDialog`. First
  swipe-delete shows the dialog; confirming deletes the item and suppresses the dialog
  for 60 minutes.
- **Storage:** `localStorage`, per device, keyed with the user id.

## Flow

1. `GroceryItemComponent` reports how the delete was triggered:
   `onDelete(item, "swipe")` from the swipe gesture, `onDelete(item, "button")` from the
   trash button.
2. `grocery-list.tsx` `handleDeleteItem(item, source)`:
   - `"button"` → delete immediately (current behavior, unchanged, incl. offline queue).
   - `"swipe"` → if within the 60-minute suppression window → delete immediately.
     Otherwise → store the item in `swipeDeleteCandidate` state and open
     `DeleteConfirmationDialog`.
3. Dialog **confirm** → record the timestamp, then delete (same offline-queue path as
   today). **Cancel** → nothing is deleted.
4. Dialog copy (Dutch): title "Item verwijderen?", description:
   *Je veegde "\<name\>" weg. Weet je zeker dat je dit item wilt verwijderen? Deze
   waarschuwing tonen we maximaal één keer per uur.*

## New helper — `client/src/lib/swipe-delete-warning.ts`

- `SWIPE_DELETE_WARNING_INTERVAL_MS = 60 * 60 * 1000`
- `shouldShowSwipeDeleteWarning(userId: string, now?: number): boolean`
  - Reads `localStorage["swipe-delete-warning-shown-at:<userId>"]`.
  - Returns `true` when missing, invalid, or older than 60 minutes.
- `recordSwipeDeleteWarningShown(userId: string, now?: number): void`
  - Writes the timestamp.
- Both wrapped in try/catch: if localStorage is unavailable (private mode), fail safe —
  always warn, never crash. Key includes the user id so shared devices warn per account.

## Edge cases

- Offline swipe with expired suppression → dialog still shows; confirm queues the
  offline delete exactly like today.
- Item deleted remotely (websocket) while the dialog is open → confirm hits the existing
  error toast. Acceptable.
- Server-side rendering / tests without `window` → helper guards `localStorage` access.

## Testing

- Unit tests for the helper: missing → warn; recent (<60 min) → suppress; expired → warn;
  corrupted value → warn; throwing storage → warn; `record…` writes the timestamp.
- Component test: swipe gesture calls `onDelete` with `"swipe"`, trash button with
  `"button"`.
- Grocery-list test: swipe opens the dialog (no delete yet), confirm deletes, cancel
  does not; button click deletes immediately without dialog.

## Files touched

- `client/src/lib/swipe-delete-warning.ts` (new)
- `client/src/components/grocery-item.tsx`
- `client/src/components/sortable-grocery-list.tsx` (type pass-through)
- `client/src/pages/grocery-list.tsx`
- `client/src/components/delete-confirmation-dialog.tsx` (copy tweak)
- Tests following existing Vitest patterns.
