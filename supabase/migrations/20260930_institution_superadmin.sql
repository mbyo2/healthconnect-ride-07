-- ============================================================
-- Doc'O Clock — Institution Superadmin (2026-09-30)
--
-- Each institution has exactly ONE superadmin: the holder of
-- healthcare_institutions.admin_id. This is structurally guaranteed
-- (single column = max one per institution).
--
-- The platform-wide super_admin role is untouched and remains
-- platform-scoped. This establishes the institution-scoped counterpart.
--
-- This migration:
--   1. Adds is_institution_super_admin() helper (SECURITY DEFINER,
--      avoids RLS recursion).
--   2. Backfills user_roles: every admin_id holder gets
--      'institution_admin' (the capability role for the superadmin).
--   3. Adds a sync trigger: admin_id changes keep user_roles consistent.
--
-- Idempotent; safe to re-run.
-- ============================================================

-- ─── 1. Helper: is this user the superadmin of this institution? ───
CREATE OR REPLACE FUNCTION public.is_institution_super_admin(p_uid UUID, p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = p_institution_id
      AND hi.admin_id = p_uid
  );
$$;

-- ─── 2. Backfill: admin_id holders get the institution_admin role ───
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT DISTINCT hi.admin_id, 'institution_admin'::public.app_role, NULL
FROM public.healthcare_institutions hi
WHERE hi.admin_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ─── 3. Sync trigger: keep user_roles aligned with admin_id ───
CREATE OR REPLACE FUNCTION public.sync_institution_superadmin_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Grant to the new superadmin.
  IF NEW.admin_id IS NOT NULL AND NEW.admin_id IS DISTINCT FROM OLD.admin_id THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.admin_id, 'institution_admin'::public.app_role, NULL)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Revoke from the old superadmin, but only if they are not superadmin
  -- of any other institution (a user may lead multiple facilities).
  IF OLD.admin_id IS NOT NULL AND OLD.admin_id IS DISTINCT FROM NEW.admin_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.admin_id = OLD.admin_id
        AND hi.id IS DISTINCT FROM NEW.id
    ) THEN
      DELETE FROM public.user_roles
      WHERE user_id = OLD.admin_id
        AND role = 'institution_admin'::public.app_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_institution_superadmin ON public.healthcare_institutions;
CREATE TRIGGER trg_sync_institution_superadmin
  AFTER INSERT OR UPDATE OF admin_id ON public.healthcare_institutions
  FOR EACH ROW EXECUTE FUNCTION public.sync_institution_superadmin_role();
