-- Track when an item was last put on the active shopping list.
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMP;

UPDATE grocery_items
SET added_at = created_at
WHERE added_at IS NULL;

ALTER TABLE grocery_items
  ALTER COLUMN added_at SET NOT NULL,
  ALTER COLUMN added_at SET DEFAULT NOW();
