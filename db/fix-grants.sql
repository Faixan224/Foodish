-- Foodish — fix missing table-level GRANTs (run once in the Supabase SQL Editor).
--
-- Symptom: "permission denied for table users" (42501) even with the service_role
-- key, causing the portal login redirect loop. This project's tables were created
-- without Supabase's standard role grants: service_role had NO access, anon only
-- had access to 4 consumer tables, authenticated had none.
--
-- RLS stays ON for every table — these grants only allow roles to reach the
-- tables; row visibility is still decided by the RLS policies.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- service_role: full access (Supabase default). Used only by server-side admin code.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- authenticated (logged-in owners/admins): table access; RLS limits them to their rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- anon: restore the consumer-app feature that was silently broken —
-- reviewer_profiles is meant to be publicly readable/writable per its RLS policies.
GRANT SELECT, INSERT, UPDATE ON public.reviewer_profiles TO anon;

-- Any table created in the future automatically gets the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
