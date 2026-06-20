-- Speed up membership lookups and grocery list queries.
-- Run after schema push (same workflow as scripts/add-family-members-unique.sql).

CREATE INDEX IF NOT EXISTS idx_family_members_user_id
  ON family_members (user_id);

CREATE INDEX IF NOT EXISTS idx_grocery_items_family_active
  ON grocery_items (family_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_grocery_items_family_sort
  ON grocery_items (family_id, sort_order, added_at);
