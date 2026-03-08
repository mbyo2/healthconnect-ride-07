
-- ============================================================
-- P0: RLS HARDENING — profiles UPDATE + 4 exposed tables
-- ============================================================

-- 1. PROFILES: Drop overly permissive UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profiles" ON public.profiles;

CREATE POLICY "Users can update own profile safely"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Trigger to prevent role/admin_level escalation
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND auth.uid() = OLD.id THEN
    IF NOT public.is_service_role() THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  IF OLD.admin_level IS DISTINCT FROM NEW.admin_level AND auth.uid() = OLD.id THEN
    IF NOT public.is_service_role() THEN
      NEW.admin_level := OLD.admin_level;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 2. LAB_TESTS: Replace USING(true) with scoped access
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.lab_tests;

CREATE POLICY "Scoped lab test access"
  ON public.lab_tests FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR ordered_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lab_technician')
    OR public.has_role(auth.uid(), 'lab')
    OR public.is_service_role()
  );

-- 3. AMBULANCE_DISPATCHES: Replace USING(true) with institution scoping
DROP POLICY IF EXISTS "Authenticated can view dispatches" ON public.ambulance_dispatches;
DROP POLICY IF EXISTS "Authenticated can manage dispatches" ON public.ambulance_dispatches;

CREATE POLICY "Scoped ambulance dispatch access"
  ON public.ambulance_dispatches FOR SELECT TO authenticated
  USING (
    crew_lead_id = auth.uid()
    OR dispatcher_id = auth.uid()
    OR (institution_id IS NOT NULL AND public.is_institution_staff_member(institution_id))
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_service_role()
  );

CREATE POLICY "Scoped ambulance dispatch manage"
  ON public.ambulance_dispatches FOR ALL TO authenticated
  USING (
    crew_lead_id = auth.uid()
    OR dispatcher_id = auth.uid()
    OR (institution_id IS NOT NULL AND public.is_institution_staff_member(institution_id))
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_service_role()
  )
  WITH CHECK (
    crew_lead_id = auth.uid()
    OR dispatcher_id = auth.uid()
    OR (institution_id IS NOT NULL AND public.is_institution_staff_member(institution_id))
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_service_role()
  );

-- 4. PHARMACY_CUSTOMERS: Replace USING(true) with pharmacy scoping
DROP POLICY IF EXISTS "Pharmacy staff can manage customers" ON public.pharmacy_customers;

CREATE POLICY "Scoped pharmacy customer access"
  ON public.pharmacy_customers FOR ALL TO authenticated
  USING (
    (pharmacy_id IS NOT NULL AND public.is_institution_staff_member(pharmacy_id))
    OR public.has_role(auth.uid(), 'pharmacist')
    OR public.has_role(auth.uid(), 'pharmacy')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_service_role()
  )
  WITH CHECK (
    (pharmacy_id IS NOT NULL AND public.is_institution_staff_member(pharmacy_id))
    OR public.has_role(auth.uid(), 'pharmacist')
    OR public.has_role(auth.uid(), 'pharmacy')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_service_role()
  );

-- 5. HOSPITAL_INVOICES: Drop old USING(true) policy
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.hospital_invoices;
