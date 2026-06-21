-- Denormalize display names for grocery items so Realtime payloads can render
-- "door Lisa" without joining family_members on every client update.
-- Historical rows keep the name from when the item was added; member renames
-- do not retroactively change added_by_name on existing items.
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS added_by_name TEXT;

UPDATE grocery_items AS gi
SET added_by_name = COALESCE(
  NULLIF(TRIM(fm.user_name), ''),
  NULLIF(TRIM(SPLIT_PART(fm.user_email, '@', 1)), ''),
  'Onbekend'
)
FROM family_members AS fm
WHERE gi.added_by = fm.user_id
  AND gi.family_id = fm.family_id
  AND gi.added_by_name IS NULL;
