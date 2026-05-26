-- Family creation is handled in api/index.js (handleCreateFamily):
-- insert family, then insert admin family_members row with email/name from JWT.
--
-- This trigger conflicted with direct Postgres connections (DATABASE_URL):
-- auth.uid() is null outside Supabase client sessions, so INSERT into families failed.

DROP TRIGGER IF EXISTS trg_family_owner ON public.families;
DROP FUNCTION IF EXISTS public.add_owner_member();
