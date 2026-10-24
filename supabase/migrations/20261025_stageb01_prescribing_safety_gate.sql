-- Stage B (Worker 1) — Clinical safety gate: P0-6 + P0-7 (server half) + P1-30.
--
-- LIVE-SCHEMA BASIS (verified 2026-10-24 against project tthzcijscedgxjfnfnky;
-- this differs from the audit brief's assumptions, which described a different
-- schema — the live facts below are what this migration is built on):
--   * comprehensive_prescriptions is PER-MEDICATION ROWS: medication_name /
--     generic_name columns, status CHECK (pending, filled, partially_filled,
--     cancelled, expired), refills_remaining. There is NO medications jsonb,
--     NO institution_id and NO override columns — the override columns are
--     added by this migration. Multi-medication prescriptions are multi-row
--     inserts sharing a prescription_number, so intra-prescription pairs are
--     screened by a statement-level AFTER INSERT trigger (row triggers cannot
--     see sibling rows of the same INSERT statement).
--   * drug_interactions columns are drug_a / drug_b (Title-case generic or
--     class names), severity vocabulary in live data: 'severe' (7 rows),
--     'moderate' (2), 'contraindicated' (1) — 10 rows total. 'severe' is
--     treated as blocking and reported as 'major'.
--   * patient_allergies columns: allergen_name, allergen_type, severity,
--     is_active.
--   * medications (patient current meds): user_id, name, is_active.
--   * pharmacy_prescriptions: medications jsonb array of {name, dosage,
--     frequency, duration} objects, doctor_id, NO override columns (hard
--     refuse on blocking findings).
--   * security_audit_log columns: user_id, event_type, event_data jsonb
--     (no action/resource_type/resource_id columns).
--   * intake_forms.allergies is jsonb (array of strings or a string).
--
-- Gate behaviour:
--   * comprehensive_prescriptions: BEFORE INSERT/UPDATE row trigger screens
--     the row's medication against the patient's allergies (4-source union)
--     and drug interactions vs the patient's other active medications.
--     Blocking findings require interaction_override_reason with >= 10
--     non-space characters; a valid override stamps interaction_overridden_by
--     and writes a security_audit_log row (event_type
--     'prescription_safety_override').
--   * An AFTER INSERT statement trigger screens medication pairs inside a
--     single multi-row insert (e.g. Warfarin + Aspirin in one prescription).
--   * pharmacy_prescriptions: BEFORE INSERT trigger screens every medication
--     in the medications jsonb; blocking findings are hard-refused (no
--     override path exists on this table).
--   * medication_administration_records (P1-30): BEFORE INSERT trigger —
--     administration is the last checkpoint: a structured allergy of
--     moderate/severe/life_threatening, or a major/contraindicated
--     interaction with an active medication, refuses the record.

-- ---------------------------------------------------------------------------
-- 1. Override columns on comprehensive_prescriptions (P0-7 server half)
-- ---------------------------------------------------------------------------
ALTER TABLE public.comprehensive_prescriptions
  ADD COLUMN IF NOT EXISTS interaction_override_reason text,
  ADD COLUMN IF NOT EXISTS interaction_overridden_by uuid;

-- ---------------------------------------------------------------------------
-- 2. Name normalisation: lower/trim, strip trailing dosage ("500mg",
--    "500 mg", bare trailing numbers) and trailing parenthetical brand notes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_drug_name(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $fn$
DECLARE
  v text;
BEGIN
  v := lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')));
  v := regexp_replace(v, '\s*\([^)]*\)\s*$', '');
  v := regexp_replace(v, '\s+\d+(\.\d+)?\s*(mg|mcg|ug|g|ml|l|iu|units?|%|mg/ml|mcg/ml).*$', '');
  v := regexp_replace(v, '\s+\d+(\.\d+)?\s*$', '');
  v := btrim(v, ' .,;');
  RETURN NULLIF(v, '');
END
$fn$;

-- ---------------------------------------------------------------------------
-- 3. Drug classes (P1-31 server mirror). Returns the classes a normalised
--    drug name belongs to; class names themselves map to their class so a
--    recorded allergy to "penicillin" or "NSAIDs" matches member drugs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.drug_classes_for(p_name text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $fn$
DECLARE
  v text := public.normalize_drug_name(p_name);
  v_classes text[] := ARRAY[]::text[];
  v_members text[];
  v_class text;
  m text;
BEGIN
  IF v IS NULL THEN
    RETURN v_classes;
  END IF;

  -- Allergen terms that ARE class names
  IF v IN ('penicillin', 'penicillins') THEN RETURN ARRAY['penicillins']; END IF;
  IF v IN ('cephalosporin', 'cephalosporins') THEN RETURN ARRAY['cephalosporins']; END IF;
  IF v IN ('sulfonamide', 'sulfonamides', 'sulfa', 'sulpha') THEN RETURN ARRAY['sulfonamides']; END IF;
  IF v IN ('nsaid', 'nsaids',
           'nonsteroidal anti-inflammatory', 'non-steroidal anti-inflammatory',
           'nonsteroidal anti-inflammatory drug', 'non-steroidal anti-inflammatory drug')
  THEN RETURN ARRAY['nsaids']; END IF;

  FOREACH v_class IN ARRAY ARRAY['penicillins', 'cephalosporins', 'sulfonamides', 'nsaids'] LOOP
    v_members := CASE v_class
      WHEN 'penicillins' THEN ARRAY[
        'penicillin', 'penicillin v', 'penicillin g', 'benzathine penicillin',
        'amoxicillin', 'ampicillin', 'flucloxacillin', 'cloxacillin',
        'co-amoxiclav', 'amoxiclav', 'augmentin']
      WHEN 'cephalosporins' THEN ARRAY[
        'cephalexin', 'cefalexin', 'cefuroxime', 'ceftriaxone', 'cefixime',
        'cefotaxime', 'cefpodoxime', 'cephalothin']
      WHEN 'sulfonamides' THEN ARRAY[
        'sulfamethoxazole', 'co-trimoxazole', 'cotrimoxazole', 'septrin',
        'sulfasalazine', 'sulfadiazine', 'sulfadoxine']
      WHEN 'nsaids' THEN ARRAY[
        'ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'acetylsalicylic acid',
        'celecoxib', 'meloxicam', 'ketorolac', 'piroxicam', 'indomethacin',
        'mefenamic acid']
    END;
    FOREACH m IN ARRAY v_members LOOP
      IF v = m OR v LIKE m || ' %' OR v LIKE m || '/%' OR v LIKE '%/' || m THEN
        v_classes := array_append(v_classes, v_class);
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_classes;
END
$fn$;

-- ---------------------------------------------------------------------------
-- 4. Name matching: substring containment either way (both sides >= 3 chars)
--    OR shared drug class. Used for allergens and interaction-table terms
--    (the interaction table also stores class terms like 'NSAIDs').
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.drug_names_match(p_a text, p_b text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $fn$
DECLARE
  a text := public.normalize_drug_name(p_a);
  b text := public.normalize_drug_name(p_b);
BEGIN
  IF a IS NULL OR b IS NULL THEN
    RETURN false;
  END IF;
  IF length(a) >= 3 AND length(b) >= 3
     AND (position(a IN b) > 0 OR position(b IN a) > 0) THEN
    RETURN true;
  END IF;
  RETURN public.drug_classes_for(a) && public.drug_classes_for(b);
END
$fn$;

-- ---------------------------------------------------------------------------
-- 5. Patient allergen union (mirrors the client's getPatientAllergies
--    sources): structured patient_allergies (with severity), institution
--    patient registry free text, comprehensive medical records allergy
--    entries, and intake-form allergies. Free-text sources are severity
--    'unknown' and structured=false (warning-only, never blocking).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collect_patient_allergens(p_patient_id uuid)
RETURNS TABLE(allergen text, severity text, structured boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
BEGIN
  RETURN QUERY
  SELECT DISTINCT x.allergen, x.severity, x.structured
  FROM (
    SELECT pa.allergen_name AS allergen,
           lower(coalesce(nullif(btrim(pa.severity), ''), 'unknown')) AS severity,
           true AS structured
      FROM public.patient_allergies pa
     WHERE pa.patient_id = p_patient_id
       AND pa.is_active IS DISTINCT FROM false

    UNION ALL

    SELECT btrim(tok), 'unknown', false
      FROM public.institution_patient_registry r,
           LATERAL regexp_split_to_table(coalesce(r.allergies, ''), '[,;|]') AS tok
     WHERE r.linked_patient_id = p_patient_id
       AND btrim(tok) <> ''

    UNION ALL

    SELECT btrim((regexp_split_to_array(
             regexp_replace(
               btrim(coalesce(rec.title, '') || ' ' || coalesce(rec.description, '')),
               '^allergy\s*[:\-–]\s*', '', 'i'),
             '[,;|]'))[1]),
           'unknown', false
      FROM public.comprehensive_medical_records rec
     WHERE rec.patient_id = p_patient_id
       AND rec.record_type ILIKE '%allerg%'

    UNION ALL

    SELECT btrim(tok), 'unknown', false
      FROM public.intake_forms f,
           LATERAL (
             SELECT CASE
                      WHEN jsonb_typeof(f.allergies) = 'array'
                        THEN (SELECT string_agg(elem, ',')
                                FROM jsonb_array_elements_text(f.allergies) AS elem)
                      WHEN jsonb_typeof(f.allergies) = 'string'
                        THEN f.allergies #>> '{}'
                      ELSE ''
                    END AS joined
           ) j,
           LATERAL regexp_split_to_table(j.joined, '[,;|]') AS tok
     WHERE f.patient_id = p_patient_id
       AND btrim(tok) <> ''
  ) x
  WHERE btrim(coalesce(x.allergen, '')) <> '';
END
$fn$;

-- ---------------------------------------------------------------------------
-- 6. The screening engine. Returns {blocking: [...], warnings: [...]}; each
--    finding = {kind, medication, matched_against, severity, detail, ...}.
--    Blocking: structured allergy severity severe/life_threatening, or an
--    interaction of severity major/contraindicated (live 'severe' maps to
--    'major'). Active medications = medications table (is_active) plus
--    medication_name/generic_name of the patient's other comprehensive
--    prescriptions in pending/filled/partially_filled, excluding
--    p_exclude_prescription_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.screen_medications(
  p_patient_id uuid,
  p_med_names text[],
  p_exclude_prescription_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  v_blocking jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_new text[];
  v_new_orig text[];
  v_active text[];
  v_seen text[] := ARRAY[]::text[];
  r record;
  pr record;
  di record;
  v_eff text;
  v_block boolean;
  v_key text;
  v_finding jsonb;
BEGIN
  -- Normalise + dedupe the candidate list.
  SELECT array_agg(n ORDER BY n), array_agg(o ORDER BY n)
    INTO v_new, v_new_orig
    FROM (
      SELECT DISTINCT ON (nn) nn AS n, oo AS o
        FROM (
          SELECT public.normalize_drug_name(x) AS nn, x AS oo
            FROM unnest(coalesce(p_med_names, ARRAY[]::text[])) AS x
        ) s
       WHERE nn IS NOT NULL
       ORDER BY nn, oo
    ) d;

  -- The patient's other active medications.
  SELECT array_agg(DISTINCT n)
    INTO v_active
    FROM (
      SELECT public.normalize_drug_name(m.name) AS n
        FROM public.medications m
       WHERE m.user_id = p_patient_id
         AND m.is_active IS DISTINCT FROM false
      UNION ALL
      SELECT public.normalize_drug_name(cp.medication_name)
        FROM public.comprehensive_prescriptions cp
       WHERE cp.patient_id = p_patient_id
         AND cp.status IN ('pending', 'filled', 'partially_filled')
         AND (p_exclude_prescription_id IS NULL OR cp.id <> p_exclude_prescription_id)
      UNION ALL
      SELECT public.normalize_drug_name(cp.generic_name)
        FROM public.comprehensive_prescriptions cp
       WHERE cp.patient_id = p_patient_id
         AND cp.status IN ('pending', 'filled', 'partially_filled')
         AND (p_exclude_prescription_id IS NULL OR cp.id <> p_exclude_prescription_id)
         AND cp.generic_name IS NOT NULL
    ) s
   WHERE n IS NOT NULL
     AND NOT (n = ANY (coalesce(v_new, ARRAY[]::text[])));

  IF v_new IS NULL THEN
    RETURN jsonb_build_object('blocking', v_blocking, 'warnings', v_warnings);
  END IF;

  -- Allergy screening.
  FOR r IN SELECT * FROM public.collect_patient_allergens(p_patient_id) LOOP
    FOR i IN 1..array_length(v_new, 1) LOOP
      IF public.drug_names_match(v_new[i], r.allergen)
         OR (public.drug_classes_for(r.allergen) @> ARRAY['penicillins']
             AND public.drug_classes_for(v_new[i]) @> ARRAY['cephalosporins'])
         OR (public.drug_classes_for(r.allergen) @> ARRAY['cephalosporins']
             AND public.drug_classes_for(v_new[i]) @> ARRAY['penicillins']) THEN
        v_eff := CASE
          WHEN r.structured THEN
            CASE lower(r.severity)
              WHEN 'life_threatening' THEN 'contraindicated'
              WHEN 'severe' THEN 'major'
              WHEN 'moderate' THEN 'moderate'
              WHEN 'mild' THEN 'minor'
              ELSE 'moderate'
            END
          ELSE 'moderate'
        END;
        v_block := r.structured AND lower(r.severity) IN ('severe', 'life_threatening');
        v_key := 'alg|' || lower(r.allergen) || '|' || v_eff;
        IF NOT (v_key = ANY (v_seen)) THEN
          v_seen := array_append(v_seen, v_key);
          v_finding := jsonb_build_object(
            'kind', 'allergy',
            'medication', v_new_orig[i],
            'matched_against', r.allergen,
            'severity', v_eff,
            'recorded_severity', r.severity,
            'structured', r.structured,
            'detail', format('Recorded %s allergy (severity: %s)', r.allergen, r.severity)
          );
          IF v_block THEN
            v_blocking := v_blocking || jsonb_build_array(v_finding);
          ELSE
            v_warnings := v_warnings || jsonb_build_array(v_finding);
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Interaction screening: pairs within the candidate list, plus each
  -- candidate against the patient's active medications.
  FOR pr IN
    SELECT x, y, x_disp, y_disp FROM (
      SELECT a.n AS x, b.n AS y, a.o AS x_disp, b.o AS y_disp
        FROM unnest(v_new, v_new_orig) WITH ORDINALITY AS a(n, o, idx)
        JOIN unnest(v_new, v_new_orig) WITH ORDINALITY AS b(n, o, idx)
          ON b.idx > a.idx
      UNION ALL
      SELECT t.n, act, t.o, act
        FROM unnest(v_new, v_new_orig) AS t(n, o),
             unnest(coalesce(v_active, ARRAY[]::text[])) AS act
    ) pairs
  LOOP
    FOR di IN
      SELECT d.drug_a, d.drug_b, d.severity, d.description, d.clinical_effect
        FROM public.drug_interactions d
       WHERE (public.drug_names_match(d.drug_a, pr.x) AND public.drug_names_match(d.drug_b, pr.y))
          OR (public.drug_names_match(d.drug_a, pr.y) AND public.drug_names_match(d.drug_b, pr.x))
    LOOP
      v_eff := CASE lower(di.severity) WHEN 'severe' THEN 'major' ELSE lower(di.severity) END;
      v_block := lower(di.severity) IN ('major', 'contraindicated', 'severe');
      v_key := 'int|' || lower(di.drug_a) || '|' || lower(di.drug_b);
      IF NOT (v_key = ANY (v_seen)) THEN
        v_seen := array_append(v_seen, v_key);
        v_finding := jsonb_build_object(
          'kind', 'interaction',
          'medication', pr.x_disp,
          'matched_against', pr.y_disp,
          'severity', v_eff,
          'recorded_severity', di.severity,
          'structured', true,
          'detail', coalesce(di.description, di.clinical_effect,
                             format('%s interacts with %s', di.drug_a, di.drug_b))
        );
        IF v_block THEN
          v_blocking := v_blocking || jsonb_build_array(v_finding);
        ELSE
          v_warnings := v_warnings || jsonb_build_array(v_finding);
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('blocking', v_blocking, 'warnings', v_warnings);
END
$fn$;

-- ---------------------------------------------------------------------------
-- 7. Plain-language summary of blocking findings (used in error messages).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.summarize_safety_findings(p_blocking jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $fn$
DECLARE
  parts text[] := ARRAY[]::text[];
  f jsonb;
BEGIN
  FOR f IN SELECT value FROM jsonb_array_elements(coalesce(p_blocking, '[]'::jsonb)) LOOP
    EXIT WHEN coalesce(array_length(parts, 1), 0) >= 3;
    IF f ->> 'kind' = 'allergy' THEN
      parts := array_append(parts, format(
        '%s conflicts with a recorded %s allergy (%s)',
        f ->> 'medication', f ->> 'matched_against',
        coalesce(f ->> 'recorded_severity', f ->> 'severity')));
    ELSE
      parts := array_append(parts, format(
        '%s interacts with %s (%s interaction)',
        f ->> 'medication', f ->> 'matched_against', f ->> 'severity'));
    END IF;
  END LOOP;
  RETURN array_to_string(parts, '; ');
END
$fn$;

-- ---------------------------------------------------------------------------
-- 8. comprehensive_prescriptions gate (row level): P0-6 + P0-7 server half.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_prescription_safety()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  v_names text[];
  v_findings jsonb;
  v_blocking jsonb;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.medication_name IS NOT DISTINCT FROM OLD.medication_name
     AND NEW.generic_name IS NOT DISTINCT FROM OLD.generic_name
     AND NEW.patient_id IS NOT DISTINCT FROM OLD.patient_id THEN
    RETURN NEW;
  END IF;

  v_names := ARRAY[NEW.medication_name];
  IF NEW.generic_name IS NOT NULL AND btrim(NEW.generic_name) <> '' THEN
    v_names := array_append(v_names, NEW.generic_name);
  END IF;

  v_findings := public.screen_medications(NEW.patient_id, v_names, NEW.id);
  v_blocking := coalesce(v_findings -> 'blocking', '[]'::jsonb);

  IF jsonb_array_length(v_blocking) > 0 THEN
    IF length(regexp_replace(coalesce(NEW.interaction_override_reason, ''), '\s', '', 'g')) < 10 THEN
      RAISE EXCEPTION 'Prescription blocked for patient safety: %. If you still intend to prescribe, re-submit with an override reason of at least 10 characters.',
        public.summarize_safety_findings(v_blocking);
    END IF;

    NEW.interaction_overridden_by := coalesce(auth.uid(), NEW.provider_id);
    INSERT INTO public.security_audit_log (user_id, event_type, event_data)
    VALUES (
      coalesce(auth.uid(), NEW.provider_id),
      'prescription_safety_override',
      jsonb_build_object(
        'resource_type', 'comprehensive_prescriptions',
        'resource_id', NEW.id,
        'patient_id', NEW.patient_id,
        'medication_name', NEW.medication_name,
        'override_reason', NEW.interaction_override_reason,
        'findings', v_findings
      )
    );
  END IF;

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_prescription_safety_gate ON public.comprehensive_prescriptions;
CREATE TRIGGER trg_prescription_safety_gate
  BEFORE INSERT OR UPDATE ON public.comprehensive_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prescription_safety();

-- ---------------------------------------------------------------------------
-- 9. comprehensive_prescriptions gate (statement level): pairs inside one
--    multi-row INSERT (one prescription, several medication rows) — row
--    triggers cannot see sibling rows of the same statement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_prescription_batch_safety()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  r record;
  v_eff text;
BEGIN
  FOR r IN
    SELECT a.patient_id AS patient_id,
           a.medication_name AS med_a, b.medication_name AS med_b,
           a.id AS id_a, b.id AS id_b,
           a.provider_id AS provider_a, b.provider_id AS provider_b,
           a.interaction_override_reason AS reason_a,
           b.interaction_override_reason AS reason_b,
           di.drug_a, di.drug_b, di.severity, di.description
      FROM new_rows a
      JOIN new_rows b
        ON b.patient_id = a.patient_id AND b.id > a.id
      JOIN public.drug_interactions di
        ON (public.drug_names_match(di.drug_a, a.medication_name)
            AND public.drug_names_match(di.drug_b, b.medication_name))
        OR (public.drug_names_match(di.drug_a, b.medication_name)
            AND public.drug_names_match(di.drug_b, a.medication_name))
        OR (a.generic_name IS NOT NULL
            AND public.drug_names_match(di.drug_a, a.generic_name)
            AND public.drug_names_match(di.drug_b, b.medication_name))
        OR (b.generic_name IS NOT NULL
            AND public.drug_names_match(di.drug_a, a.medication_name)
            AND public.drug_names_match(di.drug_b, b.generic_name))
     WHERE lower(di.severity) IN ('major', 'contraindicated', 'severe')
  LOOP
    v_eff := CASE lower(r.severity) WHEN 'severe' THEN 'major' ELSE lower(r.severity) END;
    IF length(regexp_replace(coalesce(r.reason_a, ''), '\s', '', 'g')) < 10
       OR length(regexp_replace(coalesce(r.reason_b, ''), '\s', '', 'g')) < 10 THEN
      RAISE EXCEPTION 'Prescription blocked for patient safety: % interacts with % (% interaction). If you still intend to prescribe, re-submit with an override reason of at least 10 characters.',
        r.med_a, r.med_b, v_eff;
    END IF;

    INSERT INTO public.security_audit_log (user_id, event_type, event_data)
    VALUES
      (coalesce(auth.uid(), r.provider_a), 'prescription_safety_override',
       jsonb_build_object(
         'resource_type', 'comprehensive_prescriptions',
         'resource_id', r.id_a,
         'patient_id', r.patient_id,
         'medication_name', r.med_a,
         'override_reason', r.reason_a,
         'findings', jsonb_build_object('blocking', jsonb_build_array(jsonb_build_object(
           'kind', 'interaction', 'medication', r.med_a, 'matched_against', r.med_b,
           'severity', v_eff, 'recorded_severity', r.severity,
           'detail', coalesce(r.description, format('%s interacts with %s', r.drug_a, r.drug_b))
         )))
       )),
      (coalesce(auth.uid(), r.provider_b), 'prescription_safety_override',
       jsonb_build_object(
         'resource_type', 'comprehensive_prescriptions',
         'resource_id', r.id_b,
         'patient_id', r.patient_id,
         'medication_name', r.med_b,
         'override_reason', r.reason_b,
         'findings', jsonb_build_object('blocking', jsonb_build_array(jsonb_build_object(
           'kind', 'interaction', 'medication', r.med_b, 'matched_against', r.med_a,
           'severity', v_eff, 'recorded_severity', r.severity,
           'detail', coalesce(r.description, format('%s interacts with %s', r.drug_a, r.drug_b))
         )))
       ));
  END LOOP;
  RETURN NULL;
END
$fn$;

DROP TRIGGER IF EXISTS trg_prescription_batch_safety ON public.comprehensive_prescriptions;
CREATE TRIGGER trg_prescription_batch_safety
  AFTER INSERT ON public.comprehensive_prescriptions
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_prescription_batch_safety();

-- ---------------------------------------------------------------------------
-- 10. pharmacy_prescriptions gate: hard refuse, no override path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_pharmacy_prescription_safety()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  v_names text[];
  v_findings jsonb;
  v_blocking jsonb;
BEGIN
  SELECT array_agg(n) INTO v_names
    FROM (
      SELECT coalesce(e ->> 'name', e ->> 'medication_name') AS n
        FROM jsonb_array_elements(coalesce(NEW.medications, '[]'::jsonb)) AS e
       WHERE jsonb_typeof(e) = 'object'
      UNION ALL
      SELECT e ->> 'generic_name'
        FROM jsonb_array_elements(coalesce(NEW.medications, '[]'::jsonb)) AS e
       WHERE jsonb_typeof(e) = 'object'
      UNION ALL
      SELECT e #>> '{}'
        FROM jsonb_array_elements(coalesce(NEW.medications, '[]'::jsonb)) AS e
       WHERE jsonb_typeof(e) = 'string'
    ) s
   WHERE n IS NOT NULL AND btrim(n) <> '';

  IF v_names IS NULL THEN
    RETURN NEW;
  END IF;

  v_findings := public.screen_medications(NEW.patient_id, v_names, NULL);
  v_blocking := coalesce(v_findings -> 'blocking', '[]'::jsonb);

  IF jsonb_array_length(v_blocking) > 0 THEN
    RAISE EXCEPTION 'Prescription blocked for patient safety: %. Pharmacy prescriptions cannot be overridden — remove or change the conflicting medication.',
      public.summarize_safety_findings(v_blocking);
  END IF;

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_pharmacy_prescription_safety ON public.pharmacy_prescriptions;
CREATE TRIGGER trg_pharmacy_prescription_safety
  BEFORE INSERT ON public.pharmacy_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pharmacy_prescription_safety();

-- ---------------------------------------------------------------------------
-- 11. medication_administration_records gate (P1-30): last checkpoint.
--     Structured allergy moderate+ or a major/contraindicated interaction
--     vs an active medication refuses the administration record.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_mar_safety()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  v_findings jsonb;
  f jsonb;
BEGIN
  v_findings := public.screen_medications(
    NEW.patient_id, ARRAY[NEW.medication_name], NEW.prescription_id);

  FOR f IN
    SELECT value
      FROM jsonb_array_elements(
        coalesce(v_findings -> 'blocking', '[]'::jsonb)
        || coalesce(v_findings -> 'warnings', '[]'::jsonb))
  LOOP
    IF (f ->> 'kind' = 'allergy'
        AND (f ->> 'structured')::boolean
        AND f ->> 'severity' IN ('moderate', 'major', 'contraindicated'))
       OR (f ->> 'kind' = 'interaction'
        AND f ->> 'severity' IN ('major', 'contraindicated')) THEN
      RAISE EXCEPTION 'Medication administration blocked for patient safety: %. Do not administer this medication — contact the prescriber.',
        public.summarize_safety_findings(jsonb_build_array(f));
    END IF;
  END LOOP;

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_mar_safety ON public.medication_administration_records;
CREATE TRIGGER trg_mar_safety
  BEFORE INSERT ON public.medication_administration_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mar_safety();

-- ---------------------------------------------------------------------------
-- 12. Privileges: trigger functions are invoked by the trigger machinery,
--     never directly; the patient-data helpers are definer-only.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.enforce_prescription_safety() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_prescription_batch_safety() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pharmacy_prescription_safety() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_mar_safety() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.collect_patient_allergens(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.screen_medications(uuid, text[], uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collect_patient_allergens(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.screen_medications(uuid, text[], uuid) TO service_role;
