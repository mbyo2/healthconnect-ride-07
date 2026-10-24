-- Stage C1 P2-37: allergy-deletion lockdown.
--
-- WHY: Stage B's prescribing gate (screen_medications) reads
-- public.patient_allergies. The live FOR ALL policy "Patients can manage
-- own allergies" let patients DELETE and UPDATE their own allergy rows,
-- blinding the gate. Live columns (introspected 2026-10-24): id,
-- patient_id, allergen_name, allergen_type, severity, reaction, notes,
-- reported_by, reported_at, is_active, created_at. No soft-delete flag
-- beyond is_active (which the old client flipped via UPDATE — also now
-- closed to patients).
--
-- Policy set after this migration (ALL prior policies dropped first —
-- permissive policies OR, so any leftover FOR ALL would keep DELETE
-- alive):
--   SELECT own       — patient reads own rows
--   SELECT clinical  — care relationship / admin / super_admin
--   INSERT           — patient (own) / care relationship / admin
--   UPDATE clinical  — care relationship / admin / super_admin ONLY
--   DELETE clinical  — care relationship / admin / super_admin ONLY
-- Patients keep SELECT + INSERT (self-reporting is a legitimate flow)
-- and get NO UPDATE and NO DELETE on existing rows: edits/removals are
-- clinical acts.
--
-- TRAP GUARDED: has_care_relationship(_provider,_patient) returns TRUE
-- when _provider = _patient. Every clinical UPDATE/DELETE check (policy
-- and RPC) therefore also requires auth.uid() <> patient_id, otherwise
-- the patient would pass the "clinical" check as their own provider.

DROP POLICY IF EXISTS "Patients can manage own allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Providers with care relationship can view allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Users and providers with care relationship can insert allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Users and providers with care relationship can update allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Users can view own allergies" ON public.patient_allergies;

CREATE POLICY "Patients can view own allergies"
  ON public.patient_allergies FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Clinicians can view allergies"
  ON public.patient_allergies FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_care_relationship(auth.uid(), patient_id)
  );

CREATE POLICY "Patients and clinicians can insert allergies"
  ON public.patient_allergies FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    OR public.has_care_relationship(auth.uid(), patient_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Clinicians can update allergies"
  ON public.patient_allergies FOR UPDATE TO authenticated
  USING (
    auth.uid() <> patient_id
    AND (
      public.has_care_relationship(auth.uid(), patient_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
  WITH CHECK (
    auth.uid() <> patient_id
    AND (
      public.has_care_relationship(auth.uid(), patient_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Clinicians can delete allergies"
  ON public.patient_allergies FOR DELETE TO authenticated
  USING (
    auth.uid() <> patient_id
    AND (
      public.has_care_relationship(auth.uid(), patient_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Server-side audit: every UPDATE / DELETE lands in
-- public.security_audit_log (shape fits: user_id, event_type,
-- event_data jsonb — the same table the Stage B gate writes to).
CREATE OR REPLACE FUNCTION public.audit_patient_allergy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (user_id, event_type, event_data)
    VALUES (
      auth.uid(),
      'patient_allergy_deleted',
      jsonb_build_object(
        'action', 'DELETE',
        'allergy_id', OLD.id,
        'patient_id', OLD.patient_id,
        'allergen_name', OLD.allergen_name,
        'severity', OLD.severity,
        'is_active', OLD.is_active
      )
    );
    RETURN OLD;
  END IF;
  INSERT INTO public.security_audit_log (user_id, event_type, event_data)
  VALUES (
    auth.uid(),
    'patient_allergy_updated',
    jsonb_build_object(
      'action', 'UPDATE',
      'allergy_id', NEW.id,
      'patient_id', NEW.patient_id,
      'allergen_name', NEW.allergen_name,
      'severity', NEW.severity,
      'is_active', NEW.is_active,
      'previous_allergen_name', OLD.allergen_name,
      'previous_severity', OLD.severity,
      'previous_is_active', OLD.is_active
    )
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_patient_allergy_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_patient_allergy_change ON public.patient_allergies;
CREATE TRIGGER trg_audit_patient_allergy_change
  AFTER UPDATE OR DELETE ON public.patient_allergies
  FOR EACH ROW EXECUTE FUNCTION public.audit_patient_allergy_change();

-- The only supported deletion path for clients.
CREATE OR REPLACE FUNCTION public.delete_patient_allergy(p_allergy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT patient_id INTO v_patient_id
    FROM public.patient_allergies
   WHERE id = p_allergy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allergy record not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    public.has_role(v_actor, 'admin'::app_role)
    OR public.has_role(v_actor, 'super_admin'::app_role)
    OR (v_actor <> v_patient_id AND public.has_care_relationship(v_actor, v_patient_id))
  ) THEN
    RAISE EXCEPTION 'Only your care team can remove an allergy record'
      USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.patient_allergies WHERE id = p_allergy_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_patient_allergy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_patient_allergy(uuid) TO authenticated, service_role;
