-- Stage B (Worker 2 — RLS cluster), part 1 of 3 — 2026-10-25
--
-- P1-1: profiles "Lab staff can view profiles for tests" was role-only
--       (any lab_technician / pathologist / phlebotomist / lab account
--       could read EVERY profile platform-wide). The scoped helper from
--       20260930_fix_lab_profile_policy_recursion.sql existed live but
--       the policy no longer referenced it, and its semantics were
--       still loose (any lab test anywhere). The helper is tightened
--       to institution scope and the policy is re-pointed at it.
-- P1-2: view pending_applications had ALL privileges granted to anon
--       AND authenticated and no security_invoker, so it bypassed the
--       base tables' RLS entirely (emails / phones / document URLs /
--       review notes of every pending applicant). Now invoker-secured,
--       anon revoked, authenticated SELECT only; the base tables
--       already carry admin SELECT policies, so the admin dashboard
--       keeps working and applicants see at most their own rows.
-- P1-3: lab_tests / lab_results role-only branches let any lab account
--       read / write every institution's lab work. All lab branches
--       are now scoped to the owning institution (lab_tests.lab_id /
--       lab_tests.institution_id), mirroring the pattern already used
--       by "Lab staff can verify results". NOTE: lab_results has NO
--       lab_id column live — its scope is resolved through
--       request_id / test_id -> lab_tests (the app stores lab_tests
--       ids in request_id; test_id carries the real FK).
--
-- House rules honoured: all cross-table checks live in SECURITY
-- DEFINER helpers with SET search_path = public; no inline cross-table
-- EXISTS was added to any profiles policy (2026-09 recursion lesson).

-- ---------------------------------------------------------------------
-- Shared lab helpers
-- ---------------------------------------------------------------------

-- True when p_viewer works at (active institution_staff /
-- institution_personnel) or administers the given institution.
CREATE OR REPLACE FUNCTION public.lab_institution_access(p_institution_id uuid, p_viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_institution_id IS NOT NULL
     AND p_viewer IS NOT NULL
     AND (
       EXISTS (
         SELECT 1 FROM public.institution_staff s
         WHERE s.institution_id = p_institution_id
           AND s.provider_id = p_viewer
           AND s.is_active = true
       )
       OR EXISTS (
         SELECT 1 FROM public.institution_personnel p
         WHERE p.institution_id = p_institution_id
           AND p.user_id = p_viewer
           AND p.status = 'active'
       )
       OR EXISTS (
         SELECT 1 FROM public.healthcare_institutions hi
         WHERE hi.id = p_institution_id
           AND hi.admin_id = p_viewer
       )
     );
$$;

-- True when a lab_results row belongs to p_viewer's lab scope: they
-- entered it (technician_id), or its parent lab_tests row was ordered /
-- performed / verified by them, or they hold a lab role at the
-- institution that owns the parent test.
CREATE OR REPLACE FUNCTION public.lab_result_in_scope(p_request_id uuid, p_test_id uuid, p_technician_id uuid, p_viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_viewer IS NOT NULL
     AND (
       p_technician_id = p_viewer
       OR EXISTS (
         SELECT 1 FROM public.lab_tests t
         WHERE t.id IN (p_request_id, p_test_id)
           AND (
             t.ordered_by = p_viewer
             OR t.performed_by = p_viewer
             OR t.verified_by = p_viewer
             OR (
               (
                 public.has_role(p_viewer, 'lab_technician'::app_role)
                 OR public.has_role(p_viewer, 'pathologist'::app_role)
                 OR public.has_role(p_viewer, 'phlebotomist'::app_role)
                 OR public.has_role(p_viewer, 'lab'::app_role)
               )
               AND (
                 public.lab_institution_access(t.lab_id, p_viewer)
                 OR public.lab_institution_access(t.institution_id, p_viewer)
               )
             )
           )
       )
     );
$$;

-- ---------------------------------------------------------------------
-- P1-1: lab profile visibility — institution-scoped
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_can_view_lab_profile(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT viewer_id IS NOT NULL
     AND (
       viewer_id = profile_id
       OR public.has_admin_scope(viewer_id)
       OR EXISTS (
         SELECT 1 FROM public.lab_tests t
         WHERE (t.patient_id = profile_id OR t.ordered_by = profile_id)
           AND (
             t.ordered_by = viewer_id
             OR t.performed_by = viewer_id
             OR t.verified_by = viewer_id
             OR (
               (
                 public.has_role(viewer_id, 'lab_technician'::app_role)
                 OR public.has_role(viewer_id, 'pathologist'::app_role)
                 OR public.has_role(viewer_id, 'phlebotomist'::app_role)
                 OR public.has_role(viewer_id, 'lab'::app_role)
               )
               AND (
                 public.lab_institution_access(t.lab_id, viewer_id)
                 OR public.lab_institution_access(t.institution_id, viewer_id)
               )
             )
           )
       )
     );
$$;

DROP POLICY IF EXISTS "Lab staff can view profiles for tests" ON public.profiles;

CREATE POLICY "Lab staff can view profiles for tests"
ON public.profiles FOR SELECT
TO authenticated
USING (public.user_can_view_lab_profile(auth.uid(), id));

-- ---------------------------------------------------------------------
-- P1-2: pending_applications view — invoker security + grant hygiene
-- ---------------------------------------------------------------------

ALTER VIEW public.pending_applications SET (security_invoker = true);

REVOKE ALL ON public.pending_applications FROM PUBLIC;
REVOKE ALL ON public.pending_applications FROM anon;
REVOKE ALL ON public.pending_applications FROM authenticated;
GRANT SELECT ON public.pending_applications TO authenticated;

-- ---------------------------------------------------------------------
-- P1-3: lab_tests — scope every lab-role branch to the owning lab
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Lab clinical staff can view lab tests" ON public.lab_tests;
DROP POLICY IF EXISTS "Scoped lab test access" ON public.lab_tests;

-- Reads: patient / ordering clinician / platform admin / service role,
-- plus anyone affiliated with the institution that owns the test
-- (institution tenancy — billing, CXO and hospital dashboards read lab
-- orders for their own facility), plus the performing / verifying
-- clinician. The previous lab_technician / lab role-only branches,
-- which exposed every institution's orders platform-wide, are gone.
CREATE POLICY "Scoped lab test access"
ON public.lab_tests FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
  OR ordered_by = auth.uid()
  OR public.has_admin_scope(auth.uid())
  OR public.is_service_role()
  OR performed_by = auth.uid()
  OR verified_by = auth.uid()
  OR public.lab_institution_access(lab_id, auth.uid())
  OR public.lab_institution_access(institution_id, auth.uid())
);

DROP POLICY IF EXISTS "Lab staff can manage lab tests" ON public.lab_tests;

CREATE POLICY "Lab staff can update lab tests at their institution"
ON public.lab_tests FOR UPDATE
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
    OR public.has_role(auth.uid(), 'phlebotomist'::app_role)
    OR public.has_role(auth.uid(), 'lab'::app_role)
  )
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
    OR performed_by = auth.uid()
    OR verified_by = auth.uid()
  )
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
    OR public.has_role(auth.uid(), 'phlebotomist'::app_role)
    OR public.has_role(auth.uid(), 'lab'::app_role)
  )
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
    OR performed_by = auth.uid()
    OR verified_by = auth.uid()
  )
);

CREATE POLICY "Lab staff can delete lab tests at their institution"
ON public.lab_tests FOR DELETE
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
  )
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
  )
);

-- The pre-existing verify policy scoped its USING by institution but
-- its WITH CHECK was role-only, so a verify update could move a test
-- to another institution. USING and WITH CHECK are now identical.
DROP POLICY IF EXISTS "Lab staff can verify results" ON public.lab_tests;

CREATE POLICY "Lab staff can verify results"
ON public.lab_tests FOR UPDATE
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
  )
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
    OR public.has_admin_scope(auth.uid())
  )
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
  )
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
    OR public.has_admin_scope(auth.uid())
  )
);

DROP POLICY IF EXISTS "Phlebotomists can update sample collection" ON public.lab_tests;

CREATE POLICY "Phlebotomists can update sample collection"
ON public.lab_tests FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'phlebotomist'::app_role)
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
    OR performed_by = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'phlebotomist'::app_role)
  AND (
    public.lab_institution_access(lab_id, auth.uid())
    OR public.lab_institution_access(institution_id, auth.uid())
    OR performed_by = auth.uid()
  )
);

-- ---------------------------------------------------------------------
-- P1-3: lab_results — scope the lab-role branches via the parent test
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Lab staff and care team can view lab results" ON public.lab_results;

CREATE POLICY "Lab staff and care team can view lab results"
ON public.lab_results FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id
  OR public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_admin_scope(auth.uid())
  OR public.lab_result_in_scope(request_id, test_id, technician_id, auth.uid())
);

DROP POLICY IF EXISTS "Pathologists can verify lab results" ON public.lab_results;

CREATE POLICY "Pathologists can verify lab results"
ON public.lab_results FOR UPDATE
TO authenticated
USING (
  public.has_admin_scope(auth.uid())
  OR (
    public.has_role(auth.uid(), 'pathologist'::app_role)
    AND public.lab_result_in_scope(request_id, test_id, technician_id, auth.uid())
  )
)
WITH CHECK (
  public.has_admin_scope(auth.uid())
  OR (
    public.has_role(auth.uid(), 'pathologist'::app_role)
    AND public.lab_result_in_scope(request_id, test_id, technician_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Providers with care relationship can insert lab results" ON public.lab_results;

CREATE POLICY "Providers with care relationship can insert lab results"
ON public.lab_results FOR INSERT
WITH CHECK (
  public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_admin_scope(auth.uid())
  OR public.lab_result_in_scope(request_id, test_id, technician_id, auth.uid())
);
