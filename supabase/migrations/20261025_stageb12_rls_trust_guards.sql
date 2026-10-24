-- Stage B (Worker 2 — RLS cluster), part 3 of 3 — 2026-10-25
--
-- P1-6: healthcare_institutions had a guard trigger for payment_mode
--       only (20261020_payment_mode_guard.sql). Every other trust /
--       settlement column was freely editable by the institution's
--       own admin: verified, is_verified, status, is_suspended,
--       list_in_marketplace and the bank settlement fields — an
--       institution could verify itself, un-suspend itself, list
--       itself in the marketplace, or redirect its payouts. A second
--       guard, following the exact pattern of
--       guard_payment_mode_change, now pins those columns to platform
--       administrators (direct SQL and service_role are untouched, as
--       with the payment-mode guard). payment_mode itself is NOT
--       re-guarded here; its dedicated trigger already covers it.
--       Legitimate writers checked before finalising: the admin
--       approval UI (InstitutionApplications / InstitutionManagement
--       / SuperAdminWorkflow) writes is_verified / status / is_suspended
--       with a platform-admin JWT and passes via the user_roles check;
--       institution self-provisioning INSERTs (is_verified=false,
--       status='pending') are unaffected — this is an UPDATE guard;
--       edge functions use service_role.
--       KNOWN FOLLOW-UP: InstitutionSettings and LocationSharing let
--       an institution admin toggle list_in_marketplace directly;
--       changing that toggle will now be refused with 42501 until the
--       toggle is routed through an admin-approval request, the same
--       pattern InstitutionSettings already uses for payment_mode.
-- P1-7: prevent_profile_self_elevation pinned role / admin_level /
--       is_verified / provider_type on self-update, but profiles also
--       carries is_suspended, rating and reviews_count — a suspended
--       provider could un-suspend themselves and anyone could set
--       their own rating to 5 with a PATCH. The three columns are
--       added to the same pin list, same exception style. Platform
--       admins still early-return (they suspend / unsuspend others),
--       and updates of OTHER users' rows are untouched, so review
--       aggregation and admin flows keep working.

-- ---------------------------------------------------------------------
-- P1-6: institution trust / settlement column guard
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_institution_trust_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified IS NOT DISTINCT FROM OLD.verified
     AND NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.is_suspended IS NOT DISTINCT FROM OLD.is_suspended
     AND NEW.suspended_at IS NOT DISTINCT FROM OLD.suspended_at
     AND NEW.suspension_reason IS NOT DISTINCT FROM OLD.suspension_reason
     AND NEW.list_in_marketplace IS NOT DISTINCT FROM OLD.list_in_marketplace
     AND NEW.bank_account_number IS NOT DISTINCT FROM OLD.bank_account_number
     AND NEW.bank_account_name IS NOT DISTINCT FROM OLD.bank_account_name
     AND NEW.bank_name IS NOT DISTINCT FROM OLD.bank_name
     AND NEW.swift_code IS NOT DISTINCT FROM OLD.swift_code
     AND NEW.admin_id IS NOT DISTINCT FROM OLD.admin_id THEN
    RETURN NEW;
  END IF;

  -- No JWT role claim => direct database connection (postgres / SQL editor).
  IF auth.role() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Backend edge functions / server code using the service_role key.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Platform admins only — checked against the user_roles matrix
  -- (never profiles.role, which is unreliable for gating).
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only platform administrators can change an institution''s verification, status or settlement details.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_institution_trust_columns ON public.healthcare_institutions;

CREATE TRIGGER trg_guard_institution_trust_columns
  BEFORE UPDATE ON public.healthcare_institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_institution_trust_columns();

-- ---------------------------------------------------------------------
-- P1-7: profile self-elevation — pin suspension + reputation columns
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_profile_self_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.admin_level IS DISTINCT FROM OLD.admin_level
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.provider_type IS DISTINCT FROM OLD.provider_type
       OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.reviews_count IS DISTINCT FROM OLD.reviews_count THEN
      RAISE EXCEPTION 'You cannot modify privileged profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
