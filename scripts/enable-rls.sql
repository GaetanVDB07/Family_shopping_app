-- Enable Row Level Security (defense-in-depth for Supabase anon/authenticated clients).
-- The Express API uses DATABASE_URL (postgres role) and bypasses RLS.
-- Realtime subscriptions respect these policies.

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_members_select_own" ON family_members;
CREATE POLICY "family_members_select_own"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "families_select_member" ON families;
CREATE POLICY "families_select_member"
  ON families
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "grocery_items_select_member" ON grocery_items;
CREATE POLICY "grocery_items_select_member"
  ON grocery_items
  FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
    )
  );
