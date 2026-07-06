
-- Helper: is_active-scoped institution staff check inlined via existing helper
-- public.is_institution_staff_member(institution_id) already enforces is_active = true.

-- BLOOD BANK INVENTORY
DROP POLICY IF EXISTS "Hospital staff can manage blood bank inventory" ON public.blood_bank_inventory;
DROP POLICY IF EXISTS "Hospital staff can view blood bank inventory" ON public.blood_bank_inventory;
CREATE POLICY "Active hospital staff can manage blood bank inventory"
  ON public.blood_bank_inventory FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- BLOOD BANK REQUESTS
DROP POLICY IF EXISTS "Hospital staff can manage blood bank requests" ON public.blood_bank_requests;
DROP POLICY IF EXISTS "Hospital staff can view blood bank requests" ON public.blood_bank_requests;
CREATE POLICY "Active hospital staff can manage blood bank requests"
  ON public.blood_bank_requests FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- CSSD ITEMS
DROP POLICY IF EXISTS "Hospital staff can manage CSSD items" ON public.cssd_items;
DROP POLICY IF EXISTS "Hospital staff can view CSSD items" ON public.cssd_items;
CREATE POLICY "Active hospital staff can manage CSSD items"
  ON public.cssd_items FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- CSSD TRANSACTIONS
DROP POLICY IF EXISTS "Hospital staff can manage CSSD transactions" ON public.cssd_transactions;
DROP POLICY IF EXISTS "Hospital staff can view CSSD transactions" ON public.cssd_transactions;
CREATE POLICY "Active hospital staff can manage CSSD transactions"
  ON public.cssd_transactions FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- DAY CARE PROCEDURES
DROP POLICY IF EXISTS "Hospital staff can manage day care procedures" ON public.day_care_procedures;
DROP POLICY IF EXISTS "Hospital staff can view day care procedures" ON public.day_care_procedures;
CREATE POLICY "Active hospital staff can manage day care procedures"
  ON public.day_care_procedures FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- EMERGENCY CASES
DROP POLICY IF EXISTS "Hospital staff can manage emergency cases" ON public.emergency_cases;
DROP POLICY IF EXISTS "Hospital staff can view emergency cases" ON public.emergency_cases;
CREATE POLICY "Active hospital staff can manage emergency cases"
  ON public.emergency_cases FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- RADIOLOGY REQUESTS
DROP POLICY IF EXISTS "Hospital staff can manage radiology requests" ON public.radiology_requests;
DROP POLICY IF EXISTS "Hospital staff can view radiology requests" ON public.radiology_requests;
CREATE POLICY "Active hospital staff can manage radiology requests"
  ON public.radiology_requests FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- REFERRALS
DROP POLICY IF EXISTS "Hospital staff can manage referrals" ON public.referrals;
DROP POLICY IF EXISTS "Hospital staff can view referrals" ON public.referrals;
CREATE POLICY "Active hospital staff can manage referrals"
  ON public.referrals FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- DIET PLANS
DROP POLICY IF EXISTS "Hospital staff can manage diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Hospital staff can view diet plans" ON public.diet_plans;
CREATE POLICY "Active hospital staff can manage diet plans"
  ON public.diet_plans FOR ALL TO authenticated
  USING (public.is_institution_staff_member(hospital_id))
  WITH CHECK (public.is_institution_staff_member(hospital_id));

-- DIET MEALS (joined via diet_plans.hospital_id)
DROP POLICY IF EXISTS "Hospital staff can manage diet meals" ON public.diet_meals;
DROP POLICY IF EXISTS "Hospital staff can view diet meals" ON public.diet_meals;
CREATE POLICY "Active hospital staff can manage diet meals"
  ON public.diet_meals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
      WHERE dp.id = diet_meals.diet_plan_id
        AND public.is_institution_staff_member(dp.hospital_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
      WHERE dp.id = diet_meals.diet_plan_id
        AND public.is_institution_staff_member(dp.hospital_id)
    )
  );

-- Unify role checks: badges
DROP POLICY IF EXISTS "Only admins can insert badges" ON public.badges;
CREATE POLICY "Only admins can insert badges"
  ON public.badges FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Unify role checks: health_personnel_applications
DROP POLICY IF EXISTS "Admins can update applications" ON public.health_personnel_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.health_personnel_applications;
DROP POLICY IF EXISTS "Health personnel can create applications" ON public.health_personnel_applications;

CREATE POLICY "Admins can view all applications"
  ON public.health_personnel_applications FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can update applications"
  ON public.health_personnel_applications FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Health personnel can create applications"
  ON public.health_personnel_applications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'health_personnel'::app_role)
      OR public.has_role(auth.uid(), 'doctor'::app_role)
      OR public.has_role(auth.uid(), 'nurse'::app_role)
      OR public.has_role(auth.uid(), 'pharmacist'::app_role)
      OR public.has_role(auth.uid(), 'lab_technician'::app_role)
      OR public.has_role(auth.uid(), 'radiologist'::app_role)
      OR public.has_role(auth.uid(), 'pathologist'::app_role)
      OR public.has_role(auth.uid(), 'specialist'::app_role)
    )
  );

-- Unify role checks: service_categories
DROP POLICY IF EXISTS "Only admins can modify service categories" ON public.service_categories;
CREATE POLICY "Only admins can modify service categories"
  ON public.service_categories FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );
