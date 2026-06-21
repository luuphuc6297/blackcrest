-- Hardening pass (post-migration adversarial review).

-- 1) The deny-anon migration enabled RLS on the 22 app tables but omitted
--    _prisma_migrations (Prisma-created, in the PostgREST-exposed public schema).
--    Without RLS it was anon-readable/writable via the REST API. Close it; the
--    app's postgres role bypasses RLS so migrate deploy is unaffected.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2) Defense-in-depth: the app connects via Prisma as the postgres role
--    (rolbypassrls) and NEVER uses the Supabase anon/authenticated (PostgREST)
--    roles. RLS already denies them; also strip the table grants. Guarded so the
--    chain stays portable to a plain Postgres that has no anon/authenticated role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
  END IF;
END $$;

-- 3) Pin the FTS function's search_path (Supabase advisor:
--    function_search_path_mutable). Body is already schema-qualified; explicit.
ALTER FUNCTION public.f_unaccent(text) SET search_path = public, pg_catalog;
