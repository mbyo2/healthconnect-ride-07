-- Provider-types sweep 2026-10-25: two more prescriber defects.
--
-- Defect 1: optometrists could not create prescriptions at all. The AFTER
-- INSERT trigger log_prescription_changes writes a prescription_history row
-- as the caller, and the history INSERT policy's role list omitted
-- 'optometrist' (the sixth prescribing profession) — so every optometrist
-- prescription insert failed with an RLS violation on prescription_history
-- and rolled back. Recreate the policy with the full prescriber set plus
-- the pharmacy roles that legitimately write history on dispensing.
DROP POLICY "Providers can insert prescription history" ON public.prescription_history;
CREATE POLICY "Providers can insert prescription history"
  ON public.prescription_history
  FOR INSERT
  WITH CHECK (EXISTS ( SELECT 1
     FROM user_roles ur
    WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY['doctor'::text, 'specialist'::text, 'medical_licentiate'::text, 'clinical_officer'::text, 'dentist'::text, 'optometrist'::text, 'pharmacist'::text, 'pharmacy_technologist'::text])))));

-- Defect 2: prescription numbers collided platform-wide.
-- generate_prescription_number built 'RX<date>-<epoch seconds>' under a
-- UNIQUE constraint — any two prescriptions created in the same second
-- (anywhere, by anyone) made the second insert fail with 23505 and lose
-- the prescription. Append a random suffix so same-second inserts cannot
-- collide; existing numbers are untouched and the RX<date>- prefix format
-- is preserved.
CREATE OR REPLACE FUNCTION public.generate_prescription_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.prescription_number = 'RX' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0') || '-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));
  RETURN NEW;
END;
$function$;
