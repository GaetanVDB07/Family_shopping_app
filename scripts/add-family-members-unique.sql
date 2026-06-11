-- Prevent duplicate memberships for the same user in one family.
-- Run after deduplicating any existing rows.

DELETE FROM family_members older
USING family_members newer
WHERE older.family_id = newer.family_id
  AND older.user_id = newer.user_id
  AND older.joined_at > newer.joined_at;

CREATE UNIQUE INDEX IF NOT EXISTS family_members_family_user_unique
  ON family_members (family_id, user_id);
