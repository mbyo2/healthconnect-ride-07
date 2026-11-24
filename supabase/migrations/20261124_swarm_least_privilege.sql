-- Swarm 2026-11-24 — least-privilege tightening (Order 3, batch A).
-- Findings: ~/workspace/doc-module-swarm-2026-11-24/audit-roles.md (live-verified).
-- LP-2, LP-3, LP-4, LP-5, LP-6, LP-7 + the policy surgery LP-1 needs so anon
-- never evaluates role helpers it cannot execute.

-- LP-2: TRUNCATE bypasses RLS — authenticated must not hold it (nor REFERENCES/TRIGGER)
-- on the ZRA tax mapping table. RLS-scoped SELECT/INSERT/UPDATE/DELETE stay.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.institution_zra_tax_mappings FROM authenticated;

-- LP-5: inert broad grants with no matching policy (RLS denies them; the grants mislead).
REVOKE UPDATE ON public.user_roles FROM authenticated;
REVOKE DELETE ON public.profiles FROM authenticated;

-- LP-3: permissive-OR insert policy — any provider could insert a medical record
-- for any patient (with_check was only auth.uid() = provider_id). The stricter
-- appointments-based policy remains the single insert path.
DROP POLICY IF EXISTS "Providers can create medical records" ON public.comprehensive_medical_records;

-- LP-7: the "published" policy was qual = true. Published means published_at is set.
DROP POLICY IF EXISTS "Anyone can view published health articles" ON public.health_articles;
CREATE POLICY "Anyone can view published health articles" ON public.health_articles
  FOR SELECT TO public USING (published_at IS NOT NULL);

-- LP-1/LP-4 prep on healthcare_institutions: only the marketplace directory policy
-- stays {public}, and it must not call role helpers (anon loses EXECUTE below).
-- Every staff/admin policy becomes {authenticated}; their predicates are unchanged
-- and anon never satisfied them (auth.uid() is NULL for anon).
DROP POLICY IF EXISTS "public_view_institutions" ON public.healthcare_institutions;
CREATE POLICY "public_directory_institutions" ON public.healthcare_institutions
  FOR SELECT TO public
  USING (list_in_marketplace = true AND is_verified = true AND payment_mode = 'platform');
ALTER POLICY "Institution admins can view their institution" ON public.healthcare_institutions TO authenticated;
ALTER POLICY "Institution staff can view their institution" ON public.healthcare_institutions TO authenticated;
ALTER POLICY "Super admins can view all institutions" ON public.healthcare_institutions TO authenticated;
ALTER POLICY "Super admins can insert institutions" ON public.healthcare_institutions TO authenticated;
ALTER POLICY "Super admins can update institutions" ON public.healthcare_institutions TO authenticated;
ALTER POLICY "Super admins can delete institutions" ON public.healthcare_institutions TO authenticated;

-- LP-4: anon EXECUTE off the platform-role helpers (authenticated keeps it;
-- the helpers evaluate auth.uid(), which is NULL for anon, so they only ever
-- returned false — this removes the RPC surface, not a behaviour).
REVOKE EXECUTE ON FUNCTION public.has_admin_scope(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_institution_staff_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_zra_institution_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_zra_institution_member(uuid) FROM anon;

-- LP-6: trigger-only functions are not RPC targets; strip the default PUBLIC
-- EXECUTE they never explicitly lost (119 functions live at audit time).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prorettype = 'pg_catalog.trigger'::regtype
      AND (p.proacl IS NULL OR p.proacl::text LIKE '%=X%')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
  END LOOP;
END $$;
