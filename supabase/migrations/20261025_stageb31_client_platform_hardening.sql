-- Stage B (Worker 5b — platform client + micro-DB) — 2026-10-25
--
-- P1-25 (user_roles self-grant recon): NO POLICY CHANGE.
--   Live pg_policies for public.user_roles (dumped 2026-10-24):
--     INSERT  "Admins can grant non-admin roles"  — has_role(admin) AND
--             role NOT IN (admin, super_admin) AND user_id <> auth.uid()
--     INSERT  "Super admins can grant any role"   — has_role(super_admin)
--             AND user_id <> auth.uid()
--     UPDATE  — no policy exists at all (denied for everyone via RLS)
--     DELETE  "Admins can revoke non-admin roles" / "Super admins can
--             revoke any role" — admin paths only.
--   Behavioural probe with a fresh patient JWT confirmed the dump:
--   POST /rest/v1/user_roles {user_id: self, role: 'admin'} -> 403
--   (42501 RLS violation), {user_id: self, role: 'patient'} -> 403,
--   grant-for-other -> 403, PATCH own patient row -> 200 with zero rows
--   affected, DELETE own row -> 200 with zero rows affected, and the
--   caller's roles were still exactly {patient} afterwards. Self-grant at
--   the DB layer is already impossible; the client side of P1-25 (never
--   treating user_metadata as role authority, never writing user_roles
--   from metadata) is fixed in UserRolesContext.tsx / AuthContext.tsx.
--
-- P1-23 (chat attachments): NO STORAGE POLICY CHANGE.
--   Unfiltered storage.objects dump for bucket 'chat-attachments'
--   (private bucket) shows exactly three policies: folder-scoped INSERT
--   ((storage.foldername(name))[1] = auth.uid()), folder-scoped DELETE,
--   and a participant SELECT keyed on chat_attachments rows. There is NO
--   legacy any-path upload policy to drop. The fix is client-side:
--   FileUploader uploads to '<uid>/<random>.<ext>' and stores the path;
--   FilePreview resolves createSignedUrl for path-format rows and keeps
--   rendering legacy full-URL rows as before.
--
-- This migration carries the two DB changes of this wave:
--   (1) prescription_refill_requests: patient INSERT + queue-provider
--       SELECT (the table had SELECT policies only — patients could not
--       create requests at all; approvals run through the SECURITY
--       DEFINER approve_prescription_refill RPC, so NO client UPDATE
--       policy is added).
--   (2) P1-32: server-side authorship stamping for offline-synced
--       vitals/metrics — BEFORE INSERT triggers that force
--       recorded_by / recorded_at / is_patient_entered from the real
--       caller for any authenticated (auth.uid() IS NOT NULL) insert,
--       so queued payloads can no longer forge authorship or backdate.

-- ---------------------------------------------------------------------
-- (1) prescription_refill_requests — patient create + provider queue read
-- ---------------------------------------------------------------------

-- Patients can create a refill request for themselves, and only in the
-- initial 'pending' state (decision fields stay provider/RPC-owned).
DROP POLICY IF EXISTS "Patients can create own refill requests" ON public.prescription_refill_requests;

CREATE POLICY "Patients can create own refill requests"
ON public.prescription_refill_requests FOR INSERT
TO authenticated
WITH CHECK (
  patient_id = auth.uid()
  AND status = 'pending'
);

-- Providers who work the refill queue can read requests. (The queue UI
-- additionally filters by provider_id; the pre-existing
-- "Providers view refill requests" policy — provider_id = auth.uid() —
-- remains in place. Patient reads stay scoped by the pre-existing
-- "Patients view own refill requests" policy.)
DROP POLICY IF EXISTS "Queue providers can view refill requests" ON public.prescription_refill_requests;

CREATE POLICY "Queue providers can view refill requests"
ON public.prescription_refill_requests FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'specialist'::app_role)
  OR public.has_role(auth.uid(), 'medical_licentiate'::app_role)
  OR public.has_role(auth.uid(), 'clinical_officer'::app_role)
  OR public.has_role(auth.uid(), 'dentist'::app_role)
  OR public.has_role(auth.uid(), 'pharmacist'::app_role)
);

-- ---------------------------------------------------------------------
-- (2a) P1-32 — vital_signs authorship stamping
-- Live shape: patient is user_id; there is NO top-level recorded_by or
-- is_patient_entered column — provider attribution lives in the
-- metadata jsonb (metadata.recorded_by). recorded_at is timestamptz.
-- Existing BEFORE INSERT guards (trg_block_suspended*,
-- trg_block_unverified) sort alphabetically before this trigger and are
-- unaffected; this trigger only stamps authorship/time on the way in.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.stamp_vital_signs_authorship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Stamp only real end-user calls. service_role / direct SQL have
  -- auth.uid() IS NULL and keep full control (edge functions, backfills).
  IF auth.uid() IS NOT NULL THEN
    NEW.recorded_at := now();
    NEW.metadata := jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{recorded_by}',
      to_jsonb(auth.uid()::text),
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_vital_signs_authorship ON public.vital_signs;

CREATE TRIGGER trg_stamp_vital_signs_authorship
BEFORE INSERT ON public.vital_signs
FOR EACH ROW
EXECUTE FUNCTION public.stamp_vital_signs_authorship();

-- ---------------------------------------------------------------------
-- (2b) P1-32 — comprehensive_health_metrics authorship stamping
-- This table carries top-level recorded_by (uuid), recorded_at
-- (timestamptz) and is_patient_entered (boolean) — all previously
-- client-forgeable through the offline queue. is_patient_entered is set
-- honestly: true iff the caller is recording their own metrics.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.stamp_health_metrics_authorship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.recorded_by := auth.uid();
    NEW.recorded_at := now();
    NEW.is_patient_entered := (NEW.user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_health_metrics_authorship ON public.comprehensive_health_metrics;

CREATE TRIGGER trg_stamp_health_metrics_authorship
BEFORE INSERT ON public.comprehensive_health_metrics
FOR EACH ROW
EXECUTE FUNCTION public.stamp_health_metrics_authorship();
