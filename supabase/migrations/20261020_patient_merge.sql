-- Duplicate Patient Detection & Merge (Epic parity)
-- Server-side merge: reassigns clinical history from a duplicate profile
-- to the survivor, per-table transactional, marks the duplicate, and
-- writes an audit row. Detection scan finds candidate pairs.
-- Admin gate follows the repo pattern: has_role(admin/super_admin) or
-- the caller administers an institution (healthcare_institutions.admin_id).
-- Date: 2026-10-20

-- Audit trail for every merge (never deleted)
CREATE TABLE IF NOT EXISTS public.patient_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survivor_id UUID NOT NULL REFERENCES auth.users(id),
  duplicate_id UUID NOT NULL REFERENCES auth.users(id),
  merged_by UUID REFERENCES auth.users(id),
  reason TEXT,
  tables_moved JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view merges"
  ON public.patient_merges FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.healthcare_institutions WHERE admin_id = auth.uid())
  );

-- Pointer on the duplicate profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Shared admin gate (kept as a helper so both RPCs use identical rules)
CREATE OR REPLACE FUNCTION public.can_merge_patients()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.healthcare_institutions WHERE admin_id = auth.uid());
$$;

-- Candidate-pair detection
CREATE OR REPLACE FUNCTION public.find_potential_duplicates(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id_a UUID, id_b UUID,
  name_a TEXT, name_b TEXT,
  dob_a DATE, dob_b DATE,
  phone_a TEXT, phone_b TEXT,
  match_reason TEXT, score INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.can_merge_patients() THEN
    RAISE EXCEPTION 'Only administrators can scan for duplicate patients';
  END IF;

  RETURN QUERY
  WITH norm AS (
    SELECT
      p.id,
      COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'') AS full_name,
      LOWER(REGEXP_REPLACE(COALESCE(p.first_name,'') || COALESCE(p.last_name,''), '[^a-z]', '', 'g')) AS name_key,
      p.date_of_birth,
      p.phone,
      REGEXP_REPLACE(COALESCE(p.phone,''), '[^0-9]', '', 'g') AS phone_key,
      LOWER(TRIM(COALESCE(p.email,''))) AS email_key
    FROM public.profiles p
    WHERE p.merged_into IS NULL
  )
  SELECT
    a.id, b.id,
    a.full_name, b.full_name,
    a.date_of_birth::DATE, b.date_of_birth::DATE,
    a.phone, b.phone,
    CASE
      WHEN a.phone_key <> '' AND a.phone_key = b.phone_key THEN 'Same phone number'
      WHEN a.email_key <> '' AND a.email_key = b.email_key THEN 'Same email address'
      WHEN a.name_key = b.name_key AND a.date_of_birth = b.date_of_birth THEN 'Same name + date of birth'
      ELSE 'Similar name + same date of birth'
    END,
    CASE
      WHEN a.phone_key <> '' AND a.phone_key = b.phone_key THEN 100
      WHEN a.email_key <> '' AND a.email_key = b.email_key THEN 95
      WHEN a.name_key = b.name_key AND a.date_of_birth = b.date_of_birth THEN 90
      ELSE 75
    END
  FROM norm a
  JOIN norm b ON a.id < b.id
  WHERE (
      (a.phone_key <> '' AND a.phone_key = b.phone_key)
      OR (a.email_key <> '' AND a.email_key = b.email_key)
      OR (a.name_key <> '' AND a.name_key = b.name_key
          AND a.date_of_birth = b.date_of_birth AND a.date_of_birth IS NOT NULL)
      OR (a.date_of_birth = b.date_of_birth AND a.date_of_birth IS NOT NULL
          AND a.name_key <> '' AND LEFT(a.name_key, 5) = LEFT(b.name_key, 5))
    )
  ORDER BY 9 DESC
  LIMIT p_limit;
END;
$$;

-- The merge. Each table moves in its own sub-block: a constraint surprise
-- on one table is recorded in the audit detail instead of aborting the
-- whole merge (clinical tables have no patient-unique constraints;
-- wallet rows are deliberately NOT moved — audit requirement).
CREATE OR REPLACE FUNCTION public.merge_patients(
  p_survivor UUID, p_duplicate UUID, p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pair TEXT[];
  tbl TEXT; col TEXT;
  moved INT;
  detail JSONB := '{}'::JSONB;
  errs JSONB := '{}'::JSONB;
  history TEXT[][] := ARRAY[
    ['appointments','patient_id'], ['vital_signs','user_id'],
    ['lab_tests','patient_id'], ['lab_results','patient_id'],
    ['lab_requests','patient_id'], ['lab_test_requests','patient_id'],
    ['pharmacy_prescriptions','patient_id'], ['comprehensive_prescriptions','patient_id'],
    ['prescription_refills','patient_id'], ['prescription_refill_requests','patient_id'],
    ['comprehensive_medical_records','patient_id'], ['patient_conditions','patient_id'],
    ['patient_allergies','patient_id'], ['immunizations','patient_id'],
    ['hospital_admissions','patient_id'], ['hospital_billing','patient_id'],
    ['imaging_orders','patient_id'], ['imaging_results','patient_id'],
    ['diagnostic_orders','patient_id'], ['discharge_checklists','patient_id'],
    ['triage_assessments','patient_id'], ['patient_triage_sessions','patient_id'],
    ['video_consultations','patient_id'], ['referrals','patient_id'],
    ['sample_collections','patient_id'], ['patient_queue','patient_id'],
    ['queue_tokens','patient_id'], ['orders','patient_id'],
    ['payments','patient_id'], ['billing_invoices','patient_id'],
    ['insurance_claims','patient_id'], ['patient_insurance','patient_id'],
    ['eye_examinations','patient_id'], ['phq9_assessments','patient_id'],
    ['patient_doc_folders','patient_id'], ['patient_feedback','patient_id'],
    ['vaccination_records','patient_id'], ['anc_visits','patient_id'],
    ['emergency_cases','patient_id'], ['medication_administration_records','patient_id'],
    ['day_care_procedures','patient_id'], ['ot_surgeries','patient_id'],
    ['ot_anaesthesia_records','patient_id'], ['procedure_executions','patient_id'],
    ['icu_observations','patient_id'], ['ward_transfers','patient_id'],
    ['patient_flow_tracking','patient_id'], ['symptoms_diary','patient_id'],
    ['comprehensive_health_metrics','user_id'], ['health_reminders','user_id'],
    ['medication_reminders','user_id'], ['medications','user_id'],
    ['notification_settings','user_id'], ['reminder_notifications','user_id']
  ];
BEGIN
  IF p_survivor = p_duplicate THEN
    RAISE EXCEPTION 'Cannot merge a patient into themselves';
  END IF;
  IF NOT public.can_merge_patients() THEN
    RAISE EXCEPTION 'Only administrators can merge patients';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_duplicate AND merged_into IS NOT NULL) THEN
    RAISE EXCEPTION 'Duplicate is already merged into another profile';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_survivor) THEN
    RAISE EXCEPTION 'Survivor profile not found';
  END IF;

  FOREACH pair SLICE 1 IN ARRAY history
  LOOP
    tbl := pair[1]; col := pair[2];
    IF to_regclass('public.' || tbl) IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', tbl, col, col)
        USING p_survivor, p_duplicate;
      GET DIAGNOSTICS moved = ROW_COUNT;
      IF moved > 0 THEN detail := detail || jsonb_build_object(tbl, moved); END IF;
    EXCEPTION WHEN OTHERS THEN
      errs := errs || jsonb_build_object(tbl, SQLERRM);
    END;
  END LOOP;

  -- Unique-guarded moves
  IF to_regclass('public.patient_institution_links') IS NOT NULL THEN
    BEGIN
      UPDATE public.patient_institution_links l
      SET patient_id = p_survivor
      WHERE l.patient_id = p_duplicate
      AND NOT EXISTS (SELECT 1 FROM public.patient_institution_links l2
                      WHERE l2.patient_id = p_survivor AND l2.institution_id = l.institution_id);
      GET DIAGNOSTICS moved = ROW_COUNT;
      IF moved > 0 THEN detail := detail || jsonb_build_object('patient_institution_links', moved); END IF;
    EXCEPTION WHEN OTHERS THEN
      errs := errs || jsonb_build_object('patient_institution_links', SQLERRM);
    END;
  END IF;

  IF to_regclass('public.notification_preferences') IS NOT NULL THEN
    BEGIN
      UPDATE public.notification_preferences
      SET patient_id = p_survivor WHERE patient_id = p_duplicate
      AND NOT EXISTS (SELECT 1 FROM public.notification_preferences np WHERE np.patient_id = p_survivor);
      GET DIAGNOSTICS moved = ROW_COUNT;
      IF moved > 0 THEN detail := detail || jsonb_build_object('notification_preferences', moved); END IF;
    EXCEPTION WHEN OTHERS THEN
      errs := errs || jsonb_build_object('notification_preferences', SQLERRM);
    END;
  END IF;

  UPDATE public.profiles SET merged_into = p_survivor WHERE id = p_duplicate;

  INSERT INTO public.patient_merges (survivor_id, duplicate_id, merged_by, reason, tables_moved)
  VALUES (p_survivor, p_duplicate, auth.uid(), p_reason,
          detail || jsonb_build_object('_errors', errs));

  RETURN jsonb_build_object(
    'survivor', p_survivor, 'duplicate', p_duplicate,
    'tables_moved', detail, 'errors', errs
  );
END;
$$;
