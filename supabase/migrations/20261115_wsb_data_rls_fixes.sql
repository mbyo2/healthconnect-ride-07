-- WSB security audit 2026-11-15 (Workstream B: Data, RLS & grants).
-- Live-proven before the fix (probe ids in workspace/audit-wsb/probes/):
--  D9  lookup_user_id_by_email returned any user's UUID to a plain patient.
--  D10 get_user_role returned any user's role to a plain patient.
--  D13 get_institution_compliance_status returned any institution's status
--      to a plain patient (no auth check at all).
--  D21 merge_patients passed its auth gate for an institution admin merging
--      patients with no link to their institution (failed only on the FK).
--  D17/D18/D19b institution self-verify / marketplace / payment-mode flips
--      were already blocked live by the guard triggers (no change needed).
--  D1-D7 cross-patient reads, D11/D12/D14, G1/G2 lab masking all held.
--
-- Every change below is a CREATE OR REPLACE / policy rebuild: grants are
-- preserved (no GRANT/REVOKE in this file).

-- 1) merge_patients: institution admins may only merge patients linked to
--    an institution they administer. Platform admins unchanged.
CREATE OR REPLACE FUNCTION public.merge_patients(p_survivor uuid, p_duplicate uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE pair TEXT[]; tbl TEXT; col TEXT; moved INT; detail JSONB := '{}'::JSONB; errs JSONB := '{}'::JSONB; history TEXT[][] := ARRAY[ ['appointments','patient_id'], ['vital_signs','user_id'], ['lab_tests','patient_id'], ['lab_results','patient_id'], ['lab_requests','patient_id'], ['lab_test_requests','patient_id'], ['pharmacy_prescriptions','patient_id'], ['comprehensive_prescriptions','patient_id'], ['prescription_refills','patient_id'], ['prescription_refill_requests','patient_id'], ['comprehensive_medical_records','patient_id'], ['patient_conditions','patient_id'], ['patient_allergies','patient_id'], ['immunizations','patient_id'], ['hospital_admissions','patient_id'], ['hospital_billing','patient_id'], ['imaging_orders','patient_id'], ['imaging_results','patient_id'], ['diagnostic_orders','patient_id'], ['discharge_checklists','patient_id'], ['triage_assessments','patient_id'], ['patient_triage_sessions','patient_id'], ['video_consultations','patient_id'], ['referrals','patient_id'], ['sample_collections','patient_id'], ['patient_queue','patient_id'], ['queue_tokens','patient_id'], ['orders','patient_id'], ['payments','patient_id'], ['billing_invoices','patient_id'], ['insurance_claims','patient_id'], ['patient_insurance','patient_id'], ['eye_examinations','patient_id'], ['phq9_assessments','patient_id'], ['patient_doc_folders','patient_id'], ['patient_feedback','patient_id'], ['vaccination_records','patient_id'], ['anc_visits','patient_id'], ['emergency_cases','patient_id'], ['medication_administration_records','patient_id'], ['day_care_procedures','patient_id'], ['ot_surgeries','patient_id'], ['ot_anaesthesia_records','patient_id'], ['procedure_executions','patient_id'], ['icu_observations','patient_id'], ['ward_transfers','patient_id'], ['patient_flow_tracking','patient_id'], ['symptoms_diary','patient_id'], ['comprehensive_health_metrics','user_id'], ['health_reminders','user_id'], ['medication_reminders','user_id'], ['medications','user_id'], ['notification_settings','user_id'], ['reminder_notifications','user_id'] ]; BEGIN IF p_survivor = p_duplicate THEN RAISE EXCEPTION 'Cannot merge a patient into themselves'; END IF; IF NOT public.can_merge_patients() THEN RAISE EXCEPTION 'Only administrators can merge patients'; END IF;
  -- WSB 2026-11-15: an institution admin may only merge patients linked to an
  -- institution they administer (active roster, booking, admission or queue
  -- visit). Platform admins keep platform-wide merge. Without this, any
  -- institution admin could merge arbitrary patients platform-wide.
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.institution_patients ip WHERE ip.institution_id = hi.id AND ip.patient_id = p_survivor AND ip.status = 'active')
          OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.institution_id = hi.id AND a.patient_id = p_survivor)
          OR EXISTS (SELECT 1 FROM public.hospital_admissions ha WHERE ha.hospital_id = hi.id AND ha.patient_id = p_survivor)
          OR EXISTS (SELECT 1 FROM public.queue_tokens qt WHERE qt.institution_id = hi.id AND qt.patient_id = p_survivor)
        )
        AND (
          EXISTS (SELECT 1 FROM public.institution_patients ip WHERE ip.institution_id = hi.id AND ip.patient_id = p_duplicate AND ip.status = 'active')
          OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.institution_id = hi.id AND a.patient_id = p_duplicate)
          OR EXISTS (SELECT 1 FROM public.hospital_admissions ha WHERE ha.hospital_id = hi.id AND ha.patient_id = p_duplicate)
          OR EXISTS (SELECT 1 FROM public.queue_tokens qt WHERE qt.institution_id = hi.id AND qt.patient_id = p_duplicate)
        )
    ) THEN
      RAISE EXCEPTION 'Only administrators can merge patients outside their institution';
    END IF;
  END IF; IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_duplicate AND merged_into IS NOT NULL) THEN RAISE EXCEPTION 'Duplicate is already merged into another profile'; END IF; FOREACH pair SLICE 1 IN ARRAY history LOOP tbl := pair[1]; col := pair[2]; IF to_regclass('public.' || tbl) IS NULL THEN CONTINUE; END IF; BEGIN EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', tbl, col, col) USING p_survivor, p_duplicate; GET DIAGNOSTICS moved = ROW_COUNT; IF moved > 0 THEN detail := detail || jsonb_build_object(tbl, moved); END IF; EXCEPTION WHEN OTHERS THEN errs := errs || jsonb_build_object(tbl, SQLERRM); END; END LOOP; IF to_regclass('public.patient_institution_links') IS NOT NULL THEN BEGIN UPDATE public.patient_institution_links l SET patient_id = p_survivor WHERE l.patient_id = p_duplicate AND NOT EXISTS (SELECT 1 FROM public.patient_institution_links l2 WHERE l2.patient_id = p_survivor AND l2.institution_id = l.institution_id); GET DIAGNOSTICS moved = ROW_COUNT; IF moved > 0 THEN detail := detail || jsonb_build_object('patient_institution_links', moved); END IF; EXCEPTION WHEN OTHERS THEN errs := errs || jsonb_build_object('patient_institution_links', SQLERRM); END; END IF; UPDATE public.profiles SET merged_into = p_survivor WHERE id = p_duplicate; INSERT INTO public.patient_merges (survivor_id, duplicate_id, merged_by, reason, tables_moved) VALUES (p_survivor, p_duplicate, auth.uid(), p_reason, detail || jsonb_build_object('_errors', errs)); RETURN jsonb_build_object('survivor', p_survivor, 'duplicate', p_duplicate, 'tables_moved', detail, 'errors', errs); END; $function$;

-- 2) lookup_user_id_by_email: staff managers + service role only.
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- WSB 2026-11-15: email -> UUID is an enumeration oracle (feed the UUID to
  -- get_user_role/has_role and any user's role is exposed). Only staff
  -- managers may resolve it: platform admins, institution admins, active
  -- institution staff/personnel, and the service role (send-email edge fn).
  -- Plain patients and other signed-in users are refused.
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN (SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1);
  END IF;
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (
    public.has_role(v_caller, 'admin'::public.app_role)
    OR public.has_role(v_caller, 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.healthcare_institutions hi WHERE hi.admin_id = v_caller)
    OR EXISTS (SELECT 1 FROM public.institution_staff s WHERE s.provider_id = v_caller AND s.is_active = true)
    OR EXISTS (SELECT 1 FROM public.institution_personnel ip WHERE ip.user_id = v_caller AND ip.status = 'active')
  ) THEN
    RAISE EXCEPTION 'Not authorized to look up users by email';
  END IF;
  RETURN (SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1);
END;
$function$;

-- 3) get_user_role / get_user_roles: self, platform admin, or service role.
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- WSB 2026-11-15: role lookup for an arbitrary UUID is a role-enumeration
  -- oracle (any signed-in user could map any known UUID to its role). Only
  -- the user themselves, platform admins, and the service role may call it.
  IF COALESCE(auth.role(), '') <> 'service_role' AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_admin_scope(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to read another user''s role';
  END IF;
  RETURN (SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'support' THEN 2
      WHEN 'cxo' THEN 3
      WHEN 'institution_admin' THEN 4
      WHEN 'institution_staff' THEN 5
      WHEN 'doctor' THEN 6
      WHEN 'nurse' THEN 7
      WHEN 'radiologist' THEN 8
      WHEN 'pathologist' THEN 9
      WHEN 'specialist' THEN 10
      WHEN 'health_personnel' THEN 11
      WHEN 'ot_staff' THEN 12
      WHEN 'triage_staff' THEN 13
      WHEN 'receptionist' THEN 14
      WHEN 'hr_manager' THEN 15
      WHEN 'billing_staff' THEN 16
      WHEN 'pharmacist' THEN 17
      WHEN 'pharmacy' THEN 18
      WHEN 'phlebotomist' THEN 19
      WHEN 'lab_technician' THEN 20
      WHEN 'lab' THEN 21
      WHEN 'inventory_manager' THEN 22
      WHEN 'maintenance_manager' THEN 23
      WHEN 'ambulance_staff' THEN 24
      WHEN 'patient' THEN 25
      ELSE 99
    END
  LIMIT 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
 RETURNS app_role[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- WSB 2026-11-15: role lookup for an arbitrary UUID is a role-enumeration
  -- oracle (any signed-in user could map any known UUID to its role). Only
  -- the user themselves, platform admins, and the service role may call it.
  IF COALESCE(auth.role(), '') <> 'service_role' AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_admin_scope(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to read another user''s role';
  END IF;
  RETURN (SELECT ARRAY_AGG(role ORDER BY 
    CASE role::text
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'support' THEN 2
      WHEN 'cxo' THEN 3
      WHEN 'institution_admin' THEN 4
      WHEN 'institution_staff' THEN 5
      WHEN 'doctor' THEN 6
      WHEN 'nurse' THEN 7
      WHEN 'radiologist' THEN 8
      WHEN 'pathologist' THEN 9
      WHEN 'specialist' THEN 10
      WHEN 'health_personnel' THEN 11
      WHEN 'ot_staff' THEN 12
      WHEN 'triage_staff' THEN 13
      WHEN 'receptionist' THEN 14
      WHEN 'hr_manager' THEN 15
      WHEN 'billing_staff' THEN 16
      WHEN 'pharmacist' THEN 17
      WHEN 'pharmacy' THEN 18
      WHEN 'phlebotomist' THEN 19
      WHEN 'lab_technician' THEN 20
      WHEN 'lab' THEN 21
      WHEN 'inventory_manager' THEN 22
      WHEN 'maintenance_manager' THEN 23
      WHEN 'ambulance_staff' THEN 24
      WHEN 'patient' THEN 25
      ELSE 99
    END
  )
  FROM public.user_roles
  WHERE user_id = _user_id);
END;
$function$;

-- 4) get_institution_compliance_status: caller must belong to the institution
--    (admin/staff/personnel) or be a platform admin; service role unchanged.
CREATE OR REPLACE FUNCTION public.get_institution_compliance_status(p_institution_id uuid)
 RETURNS TABLE(institution_id uuid, nhis_status text, council_status text, tax_status text, overall_compliance text, issues jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- WSB 2026-11-15: this function had no auth check at all; any
    -- authenticated user could read any institution's NHIS/council/tax
    -- compliance status. Now: platform admins, or staff/admins of that
    -- institution, or the service role.
    IF COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_institution_member(p_institution_id) THEN
      RAISE EXCEPTION 'Not authorized for this institution';
    END IF;
RETURN QUERY
    SELECT 
        p_institution_id as institution_id,
        COALESCE(znh.is_nhis_accredited::text, 'not_configured') as nhis_status,
        COALESCE(zmc.compliance_status, 'not_configured') as council_status,
        COALESCE(zt.tax_compliance_status, 'not_configured') as tax_status,
        CASE 
            WHEN COALESCE(znh.is_nhis_accredited, false) = true 
             AND COALESCE(zmc.compliance_status, 'non_compliant') = 'compliant'
             AND COALESCE(zt.tax_compliance_status, 'suspended') = 'active'
            THEN 'fully_compliant'
            WHEN COALESCE(zmc.compliance_status, 'non_compliant') = 'non_compliant'
             OR COALESCE(zt.tax_compliance_status, 'suspended') = 'suspended'
            THEN 'non_compliant'
            ELSE 'partially_compliant'
        END as overall_compliance,
        jsonb_build_object(
            'nhis', CASE WHEN znh.is_nhis_accredited THEN null ELSE 'NHIS accreditation required' END,
            'council', CASE WHEN zmc.compliance_status = 'compliant' THEN null ELSE 'Council compliance needed' END,
            'tax', CASE WHEN zt.tax_compliance_status = 'active' THEN null ELSE 'Tax compliance needed' END
        ) as issues
    FROM public.healthcare_institutions hi
    LEFT JOIN public.zambia_nhis_config znh ON hi.id = znh.institution_id
    LEFT JOIN public.zambia_medical_council_config zmc ON hi.id = zmc.institution_id
    LEFT JOIN public.zambia_tax_config zt ON hi.id = zt.institution_id
    WHERE hi.id = p_institution_id;
END;
$function$;

-- 5) hospital_billing DELETE: no client workflow deletes bills, and the old
--    policy let ANY active staff member of the institution delete any bill.
--    Restrict to the institution admin, its finance staff, platform admins.
DROP POLICY IF EXISTS "Institution staff delete hospital billing" ON public.hospital_billing;
CREATE POLICY "Institution billing delete" ON public.hospital_billing
  FOR DELETE TO authenticated
  USING (
    is_institution_admin(hospital_id)
    OR is_institution_finance_staff(hospital_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
