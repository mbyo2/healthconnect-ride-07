-- Payment-mode change guard (CEO policy enforcement)
-- Policy (CEO, 2026-10-10): a healthcare_institutions.payment_mode switch
-- ('platform' <-> 'own') may ONLY be made by a platform admin/super_admin
-- (after an approval decision in the admin inbox) or by backend service_role
-- code — never by the institution itself. Until now nothing enforced this:
-- InstitutionSettings saved payment_mode straight from a form radio, so any
-- institution admin could flip modes and defeat the marketplace listing gate.
--
-- Flow after this migration:
--   1. Institution requests a change -> security_audit_log row
--      event_type='marketplace_approval_requested'.
--   2. Admin approves in PaymentModeApprovals (Admin/SuperAdmin dashboard)
--      -> the admin's own UPDATE passes this guard (admin role check) and a
--      decision row event_type='marketplace_approval_decided' is logged.
--   3. Any other authenticated UPDATE that touches payment_mode raises 42501.
--
-- Direct database access (SQL editor / postgres, no JWT role claim) is left
-- untouched: it is already fully privileged and bypasses RLS by design.
-- Date: 2026-10-20

CREATE OR REPLACE FUNCTION public.guard_payment_mode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_mode IS NOT DISTINCT FROM OLD.payment_mode THEN
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

  RAISE EXCEPTION
    'payment_mode can only be changed by a platform admin after an approval decision (current: %, requested: %)',
    OLD.payment_mode, NEW.payment_mode
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_payment_mode_change ON public.healthcare_institutions;
CREATE TRIGGER trg_guard_payment_mode_change
  BEFORE UPDATE OF payment_mode ON public.healthcare_institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_mode_change();
