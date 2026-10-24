-- Stage C1 (Worker C) — 2026-10-25
--
-- P2-38: appointments could be BORN 'completed'. The INSERT policy
--   "Users can create appointments" checks only auth.uid() = patient_id
--   and pins no status, so a patient could insert status='completed'
--   directly (bypassing the visit entirely).
-- P2-3: the UPDATE policies let the patient (auth.uid() = patient_id)
--   and the provider update a row with NO column pinning, so a patient
--   could PATCH their own appointment to status='completed' — which
--   fires trg_appointment_complete_billing (AFTER UPDATE OF status ->
--   create_billing_on_appointment_complete()) and mints a real
--   hospital_billing invoice — or reassign provider_id to someone else.
--   The fee column was already pinned (trg_enforce_appointment_fee);
--   status / provider / institution / patient were not.
--
-- Client flows inspected before pinning (src/):
--   * BookingModal inserts status='pending' (canonical new booking).
--   * TriageIntake inserts status='scheduled' — now normalised to
--     'pending' by the INSERT pin (the client literal was updated to
--     match); a triage booking is unconfirmed until the provider acts,
--     exactly like a BookingModal booking.
--   * Offline queue (useOfflineSync) strips 'status' entirely, so a
--     replayed booking takes the column default and is pinned to
--     'pending' here — correct: it is not confirmed until synced AND
--     accepted.
--   * Patient PATCHes: status='cancelled' (AppointmentsList,
--     AppointmentDetails, Appointments), notes (AppointmentDetails),
--     and reschedule date/time (Appointments) — all preserved.
--   * Provider PATCHes: status='completed' / 'scheduled' (accept) /
--     'cancelled' (Appointments), reschedule date/time — preserved.
--   * Institution staff PATCHes: status='no_show' + follow_up_status
--     (NoShowWorkflow) and the institution-team status updates —
--     preserved via the relationship check below.
--   * NO client flow ever writes patient_id or provider_id in an
--     UPDATE, and none changes institution_id directly (it is derived
--     server-side by trg_set_appointment_institution on INSERT).
--
-- Design:
--   * INSERT pin: for JWT client callers (anon / authenticated) the
--     status is forced to 'pending' regardless of the supplied value.
--     Direct SQL (no JWT role claim) and service_role are untouched,
--     matching the house pattern (guard_payment_mode_change etc.).
--   * UPDATE pin: patient_id is immutable for EVERY client caller.
--     A caller who is the appointment's patient AND holds no
--     provider / staff / admin relationship TO THAT APPOINTMENT may
--     only move status to 'cancelled', and may not change provider_id
--     or institution_id. Date/time are deliberately NOT pinned —
--     patient reschedule is a legitimate flow.
--   * The relationship test reuses the existing SECURITY DEFINER
--     helpers (has_admin_scope, is_institution_staff_member,
--     shares_institution_with_provider) plus the institution admin_id
--     link used by the "Institution staff update linked appointments"
--     policy — no inline cross-table EXISTS is added to any policy
--     (2026-09-30 RLS recursion lesson); all logic lives in triggers.
--   * Trigger names sort as trg_appointment_* so the pins run FIRST
--     among the BEFORE triggers (before the availability gate reads
--     NEW.status, before the fee pin — which is left as the sole fee
--     guard, not duplicated here).
--   * Inspected before writing (double-effect trap): the billing
--     trigger is AFTER UPDATE and only fires on a real transition to
--     'completed', which this pin now makes unreachable for pure
--     patients; charge_booking_fee / connection / video triggers are
--     AFTER INSERT and unaffected by a status forced to 'pending'.

-- ---------------------------------------------------------------------
-- Relationship helper: does the current caller hold a provider, staff
-- or admin relationship TO this appointment (as opposed to merely
-- being its patient)?
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.appointment_actor_has_clinical_role(
  p_appointment_provider uuid,
  p_appointment_institution uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (
       auth.uid() = p_appointment_provider
       OR public.has_admin_scope(auth.uid())
       OR (
         p_appointment_institution IS NOT NULL
         AND public.is_institution_staff_member(p_appointment_institution)
       )
       OR (
         p_appointment_institution IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM public.healthcare_institutions hi
           WHERE hi.id = p_appointment_institution
             AND hi.admin_id = auth.uid()
         )
       )
       OR public.shares_institution_with_provider(p_appointment_provider)
     );
$$;

-- ---------------------------------------------------------------------
-- P2-38: INSERT pin — client-created appointments are born 'pending'
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pin_appointment_status_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No JWT role claim => direct database connection (postgres / SQL
  -- editor); backend service_role keeps full control.
  IF auth.role() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_status_pin_insert ON public.appointments;
CREATE TRIGGER trg_appointment_status_pin_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_appointment_status_on_insert();

-- ---------------------------------------------------------------------
-- P2-3: UPDATE pin — patients can only cancel their own appointment
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pin_appointment_status_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- The patient of record never changes via a client call — for any
  -- client caller, including platform admins acting through the app.
  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
    RAISE EXCEPTION 'An appointment''s patient cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  -- Pure patients (the caller is this appointment's patient and holds
  -- no provider / staff / admin relationship to it) are pinned:
  -- status may only move to 'cancelled', and the provider and
  -- institution of record cannot be reassigned.
  IF auth.uid() = OLD.patient_id
     AND NOT public.appointment_actor_has_clinical_role(
           OLD.provider_id, OLD.institution_id) THEN
    IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
      RAISE EXCEPTION 'You cannot change the provider for this appointment. Please cancel and book with the new provider instead.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
      RAISE EXCEPTION 'You cannot change the facility for this appointment. Please cancel and book again instead.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Only your provider can change this appointment''s status. You can cancel it, or ask the provider to update it.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_status_pin_update ON public.appointments;
CREATE TRIGGER trg_appointment_status_pin_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_appointment_status_on_update();
