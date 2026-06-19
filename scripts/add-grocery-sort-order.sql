-- Manual sort order for drag-to-reorder shopping route.
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY family_id ORDER BY added_at, id) - 1 AS new_sort
  FROM grocery_items
)
UPDATE grocery_items AS gi
SET sort_order = ranked.new_sort
FROM ranked
WHERE gi.id = ranked.id;
