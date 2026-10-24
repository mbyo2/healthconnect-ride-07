-- Stage C2b Cluster A — 2026-10-25
--
-- P3-27: patients could self-add duplicate / low-quality allergy rows
-- (AllergyManagement / AllergyAlertSystem insert own rows; the INSERT
-- policy scoping is correct — the defect is data quality). Duplicates
-- feed the medication-safety matcher (collect_patient_allergens() reads
-- patient_allergies rows with is_active IS DISTINCT FROM false) as noise
-- and can mask the canonical entry in review UIs.
--
-- Guard (server-side, applies to every writer — patient, clinician, FHIR
-- import, service role alike; a trigger cannot be bypassed by a direct
-- PostgREST insert):
--   * BEFORE INSERT / UPDATE trigger rejects:
--       - a blank / whitespace-only allergen_name (23514), and
--       - an ACTIVE row whose normalised allergen (lower-cased, trimmed,
--         internal whitespace collapsed) already exists for the same
--         patient on another ACTIVE row (23505, clear message).
--     Inactive (clinically removed / superseded) rows do not block a
--     fresh active entry: if the old row is is_active=false, re-adding
--     the allergen is legitimate.
--   * A partial unique expression index backs the trigger against
--     concurrent-insert races.
-- Live data check before applying: patient_allergies held 0 rows, so
-- the index cannot fail on pre-existing duplicates.
-- Legitimate entry is unchanged: patient adds a NEW allergy -> 201;
-- clinician with a care relationship adds -> 201 (RLS unchanged).

CREATE OR REPLACE FUNCTION public.guard_patient_allergy_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := lower(regexp_replace(btrim(COALESCE(NEW.allergen_name, '')), '\s+', ' ', 'g'));
BEGIN
  IF v_norm = '' THEN
    RAISE EXCEPTION 'Allergen name is required.'
      USING ERRCODE = '23514';
  END IF;

  -- Only active rows participate (the safety gate reads
  -- is_active IS DISTINCT FROM false as active).
  IF NEW.is_active IS DISTINCT FROM false THEN
    IF EXISTS (
      SELECT 1
      FROM public.patient_allergies pa
      WHERE pa.patient_id = NEW.patient_id
        AND pa.id <> NEW.id
        AND pa.is_active IS DISTINCT FROM false
        AND lower(regexp_replace(btrim(pa.allergen_name), '\s+', ' ', 'g')) = v_norm
    ) THEN
      RAISE EXCEPTION 'This allergy is already recorded for this patient: %', NEW.allergen_name
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_patient_allergy_duplicate ON public.patient_allergies;
CREATE TRIGGER trg_guard_patient_allergy_duplicate
  BEFORE INSERT OR UPDATE OF allergen_name, is_active, patient_id
  ON public.patient_allergies
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_patient_allergy_duplicate();

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_allergies_active_normalised
  ON public.patient_allergies (
    patient_id,
    (lower(regexp_replace(btrim(allergen_name), '\s+', ' ', 'g')))
  )
  WHERE is_active IS TRUE;

-- Trigger functions are not client-callable API surface.
REVOKE EXECUTE ON FUNCTION public.guard_patient_allergy_duplicate() FROM PUBLIC, anon, authenticated;
