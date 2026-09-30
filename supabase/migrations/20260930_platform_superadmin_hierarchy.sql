-- ============================================================
-- Doc'O Clock — Platform superadmin > institution superadmin (2026-09-30)
--
-- Hierarchy: the app (platform) superadmin has MORE control than any
-- institution superadmin:
--   - Platform superadmin: manage ALL institutions (suspend/unsuspend,
--     transfer superadmin), platform-wide oversight.
--   - Institution superadmin: full control WITHIN their own institution
--     only. Cannot touch other institutions or platform functions.
--
-- This migration adds SECURITY DEFINER functions that ONLY the platform
-- super_admin role can execute, enforcing the hierarchy at the DB level.
--
-- Idempotent; safe to re-run.
-- ============================================================

-- ─── Suspend / unsuspend an institution (platform superadmin only) ───
-- Suspended institutions are hidden from the marketplace and their
-- staff lose access (enforced by application logic reading status).
CREATE OR REPLACE FUNCTION public.set_institution_suspended(p_institution_id UUID, p_suspended BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only the platform superadmin may suspend institutions.
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only the platform superadmin can suspend institutions';
  END IF;

  UPDATE public.healthcare_institutions
     SET status = CASE WHEN p_suspended THEN 'suspended' ELSE 'active' END,
         updated_at = now()
   WHERE id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Institution not found: %', p_institution_id;
  END IF;
END;
$$;

-- ─── Transfer institution superadmin (platform superadmin only) ───
-- Moves the single superadmin role from one user to another. The
-- institution superadmin cannot transfer their own role — only the
-- platform superadmin can, preventing lockout and rogue transfers.
CREATE OR REPLACE FUNCTION public.transfer_institution_superadmin(p_institution_id UUID, p_new_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_admin_id UUID;
BEGIN
  -- Only the platform superadmin may transfer institution superadmins.
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only the platform superadmin can transfer an institution superadmin';
  END IF;

  -- The new superadmin must be a real user.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_new_admin_id) THEN
    RAISE EXCEPTION 'New superadmin user not found: %', p_new_admin_id;
  END IF;

  SELECT admin_id INTO v_old_admin_id
    FROM public.healthcare_institutions
   WHERE id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Institution not found: %', p_institution_id;
  END IF;

  IF v_old_admin_id IS NOT DISTINCT FROM p_new_admin_id THEN
    RETURN; -- No change needed.
  END IF;

  -- Transfer the single superadmin slot.
  UPDATE public.healthcare_institutions
     SET admin_id = p_new_admin_id,
         updated_at = now()
   WHERE id = p_institution_id;

  -- The existing trg_sync_institution_superadmin trigger keeps user_roles
  -- aligned automatically (grants the new holder, revokes the old if they
  -- lead no other institution).
END;
$$;

-- ─── Guard: institution superadmin cannot self-transfer ───
-- Even if an institution superadmin somehow calls the transfer function
-- directly, the super_admin check above blocks them. This documents the
-- hierarchy: admin_id changes flow top-down only.
