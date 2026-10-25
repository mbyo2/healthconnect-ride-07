-- Lab & imaging gate package (CEO-approved 2026-10-25, implementing the
-- recommendations in lab-imaging-gates-research-2026-10-25.md).
--
-- (a) lab_tests — split attribution. Orders record BOTH who ordered
--     (ordered_by) and who typed (entered_by, forced to the signer by
--     trigger), plus order_source and external-referrer fields for
--     paper / walk-in / external-referral orders. The loose second INSERT
--     policy ("Providers can create lab orders" — nine roles, no
--     ordered_by binding, NO institution condition at all) is replaced by
--     a staff-entry policy scoped to the caller's own institution.
--     ordered_by becomes nullable ONLY for external referrals, where the
--     ordering clinician has no platform account; the CHECK constraint
--     pins that shape so no other path can produce a NULL ordered_by.
-- (b) sample_collections — INSERT restricted to active staff/personnel of
--     the record's institution holding a COLLECTING role (phlebotomist,
--     lab technician, nurse, registered nurse, enrolled nurse, midwife,
--     doctor, specialist, clinical officer, medical licentiate, community
--     health worker — the roles that legitimately draw/collect; NOT
--     phlebotomist-only). collected_by is pinned to the signer by policy
--     and by trigger, on insert and on update.
-- (c) imaging_results gains the sign-off tier the schema lacked:
--     status draft/preliminary/final + verified_by/verified_at mirroring
--     the lab. Authorship (radiologist_id) is forced to the signer;
--     FINAL requires the radiologist role + institution membership
--     (user_can_report_for_institution, modelled on
--     user_can_verify_for_lab) and is one-way. Patients see final reports
--     only. pathologist_reviews: queue rows (unsigned, pending) may still
--     be created by institution staff — that is the lab flow's submission
--     queue — but a review may only be created signed, edited, or
--     released by a pathologist whose pathologist_id IS the signer;
--     released reviews are immutable (addendum pattern). Staff DELETE is
--     removed from imaging_orders, imaging_results and
--     pathologist_reviews (platform admins keep delete).
--
-- All six tables held 0 rows when this was written; no data migration.
-- Idempotent: safe to re-run.

-- =====================================================================
-- Helpers
-- =====================================================================

-- Roles that legitimately collect samples (research §2.3/§4).
CREATE OR REPLACE FUNCTION public.has_collecting_role(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = p_user_id
       AND ur.role IN ('phlebotomist'::app_role, 'lab_technician'::app_role,
                       'nurse'::app_role, 'registered_nurse'::app_role,
                       'enrolled_nurse'::app_role, 'midwife'::app_role,
                       'doctor'::app_role, 'specialist'::app_role,
                       'clinical_officer'::app_role,
                       'medical_licentiate'::app_role,
                       'community_health_worker'::app_role)
  );
$function$;
GRANT EXECUTE ON FUNCTION public.has_collecting_role(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_collecting_role(uuid) FROM anon, public;

-- Radiologist sign-off test, modelled on user_can_verify_for_lab:
-- role-checked, institution-checked; the signer is recorded in
-- imaging_results.verified_by by the sign-off trigger.
CREATE OR REPLACE FUNCTION public.user_can_report_for_institution(p_user_id uuid, p_institution_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(p_user_id, 'super_admin'::app_role) THEN RETURN TRUE; END IF;
  IF NOT (public.has_role(p_user_id, 'radiologist'::app_role)
          OR public.has_role(p_user_id, 'admin'::app_role)) THEN RETURN FALSE; END IF;
  IF p_institution_id IS NULL THEN RETURN TRUE; END IF;
  RETURN EXISTS (
           SELECT 1 FROM public.institution_personnel
            WHERE user_id = p_user_id AND institution_id = p_institution_id AND status = 'active'
         ) OR EXISTS (
           SELECT 1 FROM public.institution_staff
            WHERE provider_id = p_user_id AND institution_id = p_institution_id AND is_active
         );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.user_can_report_for_institution(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_report_for_institution(uuid, uuid) FROM anon, public;

-- =====================================================================
-- (a) lab_tests — attribution split
-- =====================================================================

ALTER TABLE public.lab_tests
  ADD COLUMN IF NOT EXISTS entered_by uuid REFERENCES public.profiles(id) DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'electronic',
  ADD COLUMN IF NOT EXISTS external_referrer_name text,
  ADD COLUMN IF NOT EXISTS external_referrer_facility text;

-- Nullable ONLY so external paper referrals (orderer has no account) can
-- be recorded; the CHECK below pins NULL to exactly that case.
ALTER TABLE public.lab_tests ALTER COLUMN ordered_by DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_tests_order_source_check') THEN
    ALTER TABLE public.lab_tests ADD CONSTRAINT lab_tests_order_source_check
      CHECK (order_source IN ('electronic', 'paper_form', 'verbal', 'external_referral'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_tests_attribution_shape') THEN
    ALTER TABLE public.lab_tests ADD CONSTRAINT lab_tests_attribution_shape CHECK (
      (ordered_by IS NULL
         AND order_source = 'external_referral'
         AND external_referrer_name IS NOT NULL
         AND btrim(external_referrer_name) <> '')
      OR
      (ordered_by IS NOT NULL
         AND (entered_by IS NULL OR ordered_by = entered_by OR order_source <> 'electronic'))
    );
  END IF;
END $$;

-- entered_by is the typist: set by the database, never client-supplied.
CREATE OR REPLACE FUNCTION public.enforce_lab_test_attribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.entered_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_lab_test_attribution ON public.lab_tests;
CREATE TRIGGER trg_enforce_lab_test_attribution
  BEFORE INSERT ON public.lab_tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lab_test_attribution();

-- Replace the loose policy. The strict policy ("Ordering clinicians can
-- create lab tests") is unchanged and still covers self-ordering
-- clinicians, including independents who are not institution staff.
DROP POLICY IF EXISTS "Providers can create lab orders" ON public.lab_tests;
DROP POLICY IF EXISTS "Staff can enter lab orders for their institution" ON public.lab_tests;
CREATE POLICY "Staff can enter lab orders for their institution"
  ON public.lab_tests FOR INSERT TO authenticated
  WITH CHECK (
    entered_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role IN ('doctor'::app_role, 'specialist'::app_role,
                         'medical_licentiate'::app_role, 'clinical_officer'::app_role,
                         'dentist'::app_role, 'radiologist'::app_role,
                         'pathologist'::app_role, 'lab_technician'::app_role,
                         'phlebotomist'::app_role)
    )
    AND public.lab_institution_access(COALESCE(institution_id, lab_id), auth.uid())
    AND (
      -- Self-entered order (the typist is the orderer).
      ordered_by = auth.uid()
      -- Paper referral from an outside clinician with no account.
      OR (ordered_by IS NULL
          AND order_source = 'external_referral'
          AND external_referrer_name IS NOT NULL
          AND btrim(external_referrer_name) <> '')
      -- Entered for a colleague: orderer must be an ordering clinician of
      -- the SAME institution, and the source must say how it arrived.
      OR (ordered_by IS NOT NULL
          AND order_source <> 'electronic'
          AND (public.has_role(ordered_by, 'doctor'::app_role)
               OR public.has_role(ordered_by, 'specialist'::app_role)
               OR public.has_role(ordered_by, 'medical_licentiate'::app_role)
               OR public.has_role(ordered_by, 'clinical_officer'::app_role)
               OR public.has_role(ordered_by, 'dentist'::app_role)
               OR public.has_role(ordered_by, 'radiologist'::app_role))
          AND public.lab_institution_access(COALESCE(institution_id, lab_id), ordered_by))
    )
  );

-- =====================================================================
-- (b) sample_collections — collecting-role gate + collector identity
-- =====================================================================

-- collected_by can only ever name the signer (insert and update).
CREATE OR REPLACE FUNCTION public.enforce_sample_collector_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.collected_by IS NOT NULL
     AND NEW.collected_by <> auth.uid() THEN
    RAISE EXCEPTION 'You can only record yourself as the sample collector.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_sample_collector_identity ON public.sample_collections;
CREATE TRIGGER trg_enforce_sample_collector_identity
  BEFORE INSERT OR UPDATE ON public.sample_collections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sample_collector_identity();

DROP POLICY IF EXISTS "Phlebotomists can insert sample_collections" ON public.sample_collections;
DROP POLICY IF EXISTS "Collecting staff can insert sample_collections" ON public.sample_collections;
CREATE POLICY "Collecting staff can insert sample_collections"
  ON public.sample_collections FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.has_collecting_role(auth.uid()) OR public.has_admin_scope(auth.uid()))
    AND (institution_id IS NULL
         OR public.is_institution_staff_member(institution_id)
         OR public.is_institution_admin(institution_id)
         OR public.has_admin_scope(auth.uid()))
    AND (collected_by IS NULL OR collected_by = auth.uid())
  );

-- Update keeps the previous scoping (creator / collector / institution
-- staff / institution admin) but third-party staff updates now also need
-- a collecting role; the trigger above pins collected_by.
DROP POLICY IF EXISTS "Phlebotomists can update sample_collections" ON public.sample_collections;
DROP POLICY IF EXISTS "Collecting staff can update sample_collections" ON public.sample_collections;
CREATE POLICY "Collecting staff can update sample_collections"
  ON public.sample_collections FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR collected_by = auth.uid()
    OR (institution_id IS NOT NULL
        AND ((public.is_institution_staff(institution_id, auth.uid())
              AND public.has_collecting_role(auth.uid()))
             OR public.is_institution_admin(institution_id)))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR collected_by = auth.uid()
    OR (institution_id IS NOT NULL
        AND ((public.is_institution_staff(institution_id, auth.uid())
              AND public.has_collecting_role(auth.uid()))
             OR public.is_institution_admin(institution_id)))
  );

-- =====================================================================
-- (c) imaging_results — sign-off tier
-- =====================================================================

ALTER TABLE public.imaging_results
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'imaging_results_status_check') THEN
    ALTER TABLE public.imaging_results ADD CONSTRAINT imaging_results_status_check
      CHECK (status IN ('draft', 'preliminary', 'final'));
  END IF;
END $$;

-- Authorship is the signer; preliminary is a radiographer/radiologist
-- tier; final is a radiologist act, recorded and one-way.
CREATE OR REPLACE FUNCTION public.enforce_imaging_result_signoff()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_institution uuid;
BEGIN
  IF v_caller IS NOT NULL THEN
    NEW.radiologist_id := v_caller;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'final' THEN
    RAISE EXCEPTION 'Final imaging reports cannot be edited — file an addendum report instead.'
      USING ERRCODE = '42501';
  END IF;

  SELECT o.institution_id INTO v_institution
    FROM public.imaging_orders o WHERE o.id = NEW.order_id;

  IF NEW.status = 'preliminary'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'preliminary')
     AND v_caller IS NOT NULL
     AND NOT (public.has_role(v_caller, 'radiographer'::app_role)
              OR public.has_role(v_caller, 'radiologist'::app_role)
              OR public.has_admin_scope(v_caller)) THEN
    RAISE EXCEPTION 'A preliminary evaluation can only be filed by a radiographer or radiologist.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'final'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'final')
     AND v_caller IS NOT NULL
     AND NOT public.user_can_report_for_institution(v_caller, v_institution) THEN
    RAISE EXCEPTION 'Only a radiologist of this institution can issue a final imaging report.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'final' THEN
    NEW.verified_by := v_caller;
    NEW.verified_at := COALESCE(NEW.verified_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_imaging_result_signoff ON public.imaging_results;
CREATE TRIGGER trg_enforce_imaging_result_signoff
  BEFORE INSERT OR UPDATE ON public.imaging_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_imaging_result_signoff();

-- Split the staff ALL policy: same read/write scope as before, no staff
-- DELETE; patients see FINAL reports only (preliminary is a care-team
-- tier, per the research recommendation).
DROP POLICY IF EXISTS "Institution staff manage imaging results" ON public.imaging_results;
DROP POLICY IF EXISTS "Patients view own imaging results" ON public.imaging_results;
DROP POLICY IF EXISTS "Institution staff can view imaging results" ON public.imaging_results;
DROP POLICY IF EXISTS "Institution staff can create imaging results" ON public.imaging_results;
DROP POLICY IF EXISTS "Institution staff can update imaging results" ON public.imaging_results;
DROP POLICY IF EXISTS "Admins can delete imaging results" ON public.imaging_results;
DROP POLICY IF EXISTS "Patients view own final imaging results" ON public.imaging_results;

CREATE POLICY "Institution staff can view imaging results"
  ON public.imaging_results FOR SELECT TO authenticated
  USING (
    (order_id IN (SELECT o.id FROM public.imaging_orders o
                   WHERE (o.institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                                                WHERE s.provider_id = auth.uid() AND s.is_active)
                          OR o.institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                                                   WHERE hi.admin_id = auth.uid()))))
    OR public.has_admin_scope(auth.uid())
  );

CREATE POLICY "Institution staff can create imaging results"
  ON public.imaging_results FOR INSERT TO authenticated
  WITH CHECK (
    (order_id IN (SELECT o.id FROM public.imaging_orders o
                   WHERE (o.institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                                                WHERE s.provider_id = auth.uid() AND s.is_active)
                          OR o.institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                                                   WHERE hi.admin_id = auth.uid()))))
    OR public.has_admin_scope(auth.uid())
  );

CREATE POLICY "Institution staff can update imaging results"
  ON public.imaging_results FOR UPDATE TO authenticated
  USING (
    (order_id IN (SELECT o.id FROM public.imaging_orders o
                   WHERE (o.institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                                                WHERE s.provider_id = auth.uid() AND s.is_active)
                          OR o.institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                                                   WHERE hi.admin_id = auth.uid()))))
    OR public.has_admin_scope(auth.uid())
  )
  WITH CHECK (
    (order_id IN (SELECT o.id FROM public.imaging_orders o
                   WHERE (o.institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                                                WHERE s.provider_id = auth.uid() AND s.is_active)
                          OR o.institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                                                   WHERE hi.admin_id = auth.uid()))))
    OR public.has_admin_scope(auth.uid())
  );

CREATE POLICY "Admins can delete imaging results"
  ON public.imaging_results FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid()));

CREATE POLICY "Patients view own final imaging results"
  ON public.imaging_results FOR SELECT TO authenticated
  USING (patient_id = auth.uid() AND status = 'final');

-- =====================================================================
-- (c) imaging_orders — entry stays staff-wide; staff DELETE removed
-- =====================================================================

DROP POLICY IF EXISTS "Institution staff manage imaging orders" ON public.imaging_orders;
DROP POLICY IF EXISTS "Institution staff can view imaging orders" ON public.imaging_orders;
DROP POLICY IF EXISTS "Institution staff can create imaging orders" ON public.imaging_orders;
DROP POLICY IF EXISTS "Institution staff can update imaging orders" ON public.imaging_orders;
DROP POLICY IF EXISTS "Admins can delete imaging orders" ON public.imaging_orders;

CREATE POLICY "Institution staff can view imaging orders"
  ON public.imaging_orders FOR SELECT TO authenticated
  USING (
    (institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                         WHERE s.provider_id = auth.uid() AND s.is_active)
     OR institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                            WHERE hi.admin_id = auth.uid())
     OR public.has_admin_scope(auth.uid()))
  );

CREATE POLICY "Institution staff can create imaging orders"
  ON public.imaging_orders FOR INSERT TO authenticated
  WITH CHECK (
    (institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                         WHERE s.provider_id = auth.uid() AND s.is_active)
     OR institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                            WHERE hi.admin_id = auth.uid())
     OR public.has_admin_scope(auth.uid()))
  );

CREATE POLICY "Institution staff can update imaging orders"
  ON public.imaging_orders FOR UPDATE TO authenticated
  USING (
    (institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                         WHERE s.provider_id = auth.uid() AND s.is_active)
     OR institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                            WHERE hi.admin_id = auth.uid())
     OR public.has_admin_scope(auth.uid()))
  )
  WITH CHECK (
    (institution_id IN (SELECT s.institution_id FROM public.institution_staff s
                         WHERE s.provider_id = auth.uid() AND s.is_active)
     OR institution_id IN (SELECT hi.id FROM public.healthcare_institutions hi
                            WHERE hi.admin_id = auth.uid())
     OR public.has_admin_scope(auth.uid()))
  );

CREATE POLICY "Admins can delete imaging orders"
  ON public.imaging_orders FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid()));

-- =====================================================================
-- (c) pathologist_reviews — signer-bound reviews
-- =====================================================================

-- pathologist_id becomes a real identity reference (it was a bare uuid).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pathologist_reviews_pathologist_fk') THEN
    ALTER TABLE public.pathologist_reviews
      ADD CONSTRAINT pathologist_reviews_pathologist_fk
      FOREIGN KEY (pathologist_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- A review may only carry the signer's identity; the displayed name is
-- derived from the signer's profile, never typed; released = immutable.
CREATE OR REPLACE FUNCTION public.enforce_pathologist_review_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_name text;
BEGIN
  IF v_caller IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' AND OLD.released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Released pathology reviews cannot be edited.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.pathologist_id IS NOT NULL AND NEW.pathologist_id <> v_caller THEN
    RAISE EXCEPTION 'A pathology review can only be signed under your own name.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.released_at IS NOT NULL AND NEW.pathologist_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the signing pathologist can release this review.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.pathologist_id IS NOT NULL THEN
    SELECT NULLIF(btrim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
      INTO v_name FROM public.profiles p WHERE p.id = NEW.pathologist_id;
    IF v_name IS NOT NULL THEN NEW.pathologist_name := v_name; END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_pathologist_review_identity ON public.pathologist_reviews;
CREATE TRIGGER trg_enforce_pathologist_review_identity
  BEFORE INSERT OR UPDATE ON public.pathologist_reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pathologist_review_identity();

-- Split the staff ALL policy. Queue creation (unsigned, pending) stays
-- open to institution staff — that is the lab flow's submission queue.
-- Signed artefacts are pathologist-only.
DROP POLICY IF EXISTS "Institution staff can manage reviews" ON public.pathologist_reviews;
DROP POLICY IF EXISTS "Institution staff can view reviews" ON public.pathologist_reviews;
DROP POLICY IF EXISTS "Staff can queue pathology reviews" ON public.pathologist_reviews;
DROP POLICY IF EXISTS "Pathologists can create reviews" ON public.pathologist_reviews;
DROP POLICY IF EXISTS "Pathologists can update reviews" ON public.pathologist_reviews;
DROP POLICY IF EXISTS "Admins can delete pathology reviews" ON public.pathologist_reviews;

CREATE POLICY "Institution staff can view reviews"
  ON public.pathologist_reviews FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id));

CREATE POLICY "Staff can queue pathology reviews"
  ON public.pathologist_reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.is_institution_staff_member(institution_id)
    AND pathologist_id IS NULL
    AND reviewed_at IS NULL
    AND released_at IS NULL
    AND status IN ('pending_review', 'urgent_review')
  );

CREATE POLICY "Pathologists can create reviews"
  ON public.pathologist_reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.is_institution_staff_member(institution_id)
    AND public.has_role(auth.uid(), 'pathologist'::app_role)
    AND pathologist_id = auth.uid()
  );

CREATE POLICY "Pathologists can update reviews"
  ON public.pathologist_reviews FOR UPDATE TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    AND public.has_role(auth.uid(), 'pathologist'::app_role)
    AND (pathologist_id IS NULL OR pathologist_id = auth.uid())
  )
  WITH CHECK (
    public.is_institution_staff_member(institution_id)
    AND public.has_role(auth.uid(), 'pathologist'::app_role)
    AND (pathologist_id IS NULL OR pathologist_id = auth.uid())
  );

CREATE POLICY "Admins can delete pathology reviews"
  ON public.pathologist_reviews FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid()));
