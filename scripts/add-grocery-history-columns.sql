-- Track when items were checked off and when they were archived for purchase history.
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Backfill completion timestamps for items already checked off.
UPDATE grocery_items
SET completed_at = COALESCE(added_at, created_at)
WHERE completed = TRUE
  AND completed_at IS NULL;
