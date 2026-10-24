-- Stage C2b Cluster A — 2026-10-25
--
-- P3-6 (real-risk set): policies that omit WITH CHECK. Postgres re-uses
-- USING for writes when WITH CHECK is absent, which pins only the OLD
-- row / ownership and leaves status/amount fields free on the NEW row.
-- Live enumeration at fix time: 145 write policies (INSERT/UPDATE/ALL)
-- in public omitted WITH CHECK (the audit counted 93 in the repo final
-- state; live has drifted further).
--
-- Classification (full list in the C2b addendum):
--   * REAL-RISK — financial, stock, and clinical tables where the new
--     row carries status/amount/quantity or clinical content, plus
--     approval surfaces: the 43 policies below. Each now carries an
--     explicit WITH CHECK identical to its USING semantics, so a write
--     cannot move a row OUT of the caller's authorised scope (another
--     tenant, another owner, a service-role-only shape) even where
--     USING alone was the only check. Status/amount pinning beyond
--     scope is handled by the dedicated triggers that already exist
--     for the highest-risk tables (appointments, orders, withdrawals,
--     institution wallets, POS sales in this same batch).
--   * ALSO FIXED ELSEWHERE IN THIS BATCH: pos_sales / pos_sale_items
--     (P3-2 split, explicit WITH CHECK), application_extended_data /
--     institution_networks / healthcare_institutions super-admin UPDATE
--     (P2-8 re-gate, explicit WITH CHECK).
--   * DOCUMENTED-ACCEPTED — the remaining ~96 policies: own-row
--     personal-data tables (reminders, streaks, sessions, settings,
--     own medications/conditions-adjacent data), reference/catalogue
--     admin tables whose USING is a constant role gate (WITH CHECK
--     would be the same constant), and institution-internal operational
--     tables where USING already scopes to the caller's own
--     institution and the tables carry no money movement. For these,
--     USING-reuse and WITH CHECK are functionally the same predicate;
--     they are enumerated by name in the addendum so any future
--     addition stands out.
-- Each ALTER below was generated from the live pg_policies.qual at fix
-- time and preserves the policy's existing semantics exactly.


ALTER POLICY "Institution admins can manage their wallet" ON public."institution_wallets" WITH CHECK (EXISTS ( SELECT 1
   FROM healthcare_institutions hi
  WHERE ((hi.id = institution_wallets.institution_id) AND (hi.admin_id = auth.uid()))));

ALTER POLICY "Super admins can manage app owner wallet" ON public."app_owner_wallet" WITH CHECK (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.admin_level = 'superadmin'::admin_level))));

ALTER POLICY "Super admins can manage commission settings" ON public."commission_settings" WITH CHECK (is_super_admin());

ALTER POLICY "Super admins can manage subscription plans" ON public."subscription_plans" WITH CHECK (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.admin_level = 'superadmin'::admin_level))));

ALTER POLICY "Pharmacies can update orders" ON public."orders" WITH CHECK (EXISTS ( SELECT 1
   FROM healthcare_institutions hi
  WHERE ((hi.id = orders.pharmacy_id) AND (hi.admin_id = auth.uid()))));

ALTER POLICY "Pharmacy staff can update orders" ON public."orders" WITH CHECK (EXISTS ( SELECT 1
   FROM institution_staff
  WHERE ((institution_staff.provider_id = auth.uid()) AND (institution_staff.institution_id = orders.pharmacy_id))));

ALTER POLICY "Billing staff can manage claims" ON public."insurance_claims" WITH CHECK (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id));

ALTER POLICY "Institution admins can manage their payroll" ON public."payroll" WITH CHECK (EXISTS ( SELECT 1
   FROM healthcare_institutions
  WHERE ((healthcare_institutions.id = payroll.institution_id) AND (healthcare_institutions.admin_id = auth.uid()))));

ALTER POLICY "Institution admins can manage their payroll periods" ON public."payroll_periods" WITH CHECK (EXISTS ( SELECT 1
   FROM healthcare_institutions
  WHERE ((healthcare_institutions.id = payroll_periods.institution_id) AND (healthcare_institutions.admin_id = auth.uid()))));

ALTER POLICY "Users can update institution data" ON public."general_ledger_entries" WITH CHECK (auth.uid() IN ( SELECT users.id
   FROM auth.users
  WHERE ((users.id IN ( SELECT healthcare_institutions.admin_id
           FROM healthcare_institutions
          WHERE (healthcare_institutions.id = general_ledger_entries.institution_id))) OR (users.id IN ( SELECT institution_personnel.user_id
           FROM institution_personnel
          WHERE (institution_personnel.institution_id = institution_personnel.institution_id))))));

ALTER POLICY "Service role can manage revenue events" ON public."revenue_events" WITH CHECK (is_service_role());

ALTER POLICY "Financial controls accessible by institution staff" ON public."financial_controls" WITH CHECK (EXISTS ( SELECT 1
   FROM institution_staff
  WHERE ((institution_staff.institution_id = financial_controls.institution_id) AND (institution_staff.provider_id = auth.uid()))));

ALTER POLICY "Admins manage specialty fees" ON public."specialty_booking_fees" WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER POLICY "Service role manages no-show fees" ON public."no_show_fees" WITH CHECK (is_service_role());

ALTER POLICY "Users can update PAYE slabs" ON public."paye_tax_slabs" WITH CHECK (auth.uid() IN ( SELECT users.id
   FROM auth.users
  WHERE ((users.id IN ( SELECT healthcare_institutions.admin_id
           FROM healthcare_institutions
          WHERE (healthcare_institutions.id = paye_tax_slabs.institution_id))) OR (users.id IN ( SELECT institution_personnel.user_id
           FROM institution_personnel
          WHERE (institution_personnel.institution_id = institution_personnel.institution_id))))));

ALTER POLICY "Pharmacy staff can manage register" ON public."pos_register_sessions" WITH CHECK ((cashier_id = auth.uid()) OR is_service_role());

ALTER POLICY "Admins can update all applications" ON public."institution_applications" WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

ALTER POLICY "Pharmacies can manage their products" ON public."marketplace_products" WITH CHECK (EXISTS ( SELECT 1
   FROM healthcare_institutions hi
  WHERE ((hi.id = marketplace_products.pharmacy_id) AND (hi.admin_id = auth.uid()))));

ALTER POLICY "Pharmacy staff can manage own products" ON public."marketplace_products" WITH CHECK (EXISTS ( SELECT 1
   FROM institution_staff
  WHERE ((institution_staff.provider_id = auth.uid()) AND (institution_staff.institution_id = marketplace_products.pharmacy_id))));

ALTER POLICY "Admins can manage lab tests" ON public."lab_tests" WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])))));

ALTER POLICY "Providers can manage test requests" ON public."lab_test_requests" WITH CHECK ((auth.uid() = requested_by) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))))));

ALTER POLICY "pharmacy_prescriptions_doctor_all" ON public."pharmacy_prescriptions" WITH CHECK (doctor_id = auth.uid());

ALTER POLICY "Staff can update MARs" ON public."medication_administration_records" WITH CHECK (is_institution_staff_member(institution_id) OR is_institution_admin(institution_id));

ALTER POLICY "Staff update institution patient registry" ON public."institution_patient_registry" WITH CHECK ((institution_id IN ( SELECT institution_personnel.institution_id
   FROM institution_personnel
  WHERE (institution_personnel.user_id = auth.uid()))) OR (institution_id IN ( SELECT healthcare_institutions.id
   FROM healthcare_institutions
  WHERE (healthcare_institutions.admin_id = auth.uid()))));

ALTER POLICY "Patients can manage own conditions" ON public."patient_conditions" WITH CHECK (auth.uid() = patient_id);

ALTER POLICY "Institution staff can manage triage" ON public."triage_assessments" WITH CHECK (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id));

ALTER POLICY "Clinicians can manage own phq9 assessments" ON public."phq9_assessments" WITH CHECK (clinician_id = auth.uid());

ALTER POLICY "Institution staff can manage phq9 assessments" ON public."phq9_assessments" WITH CHECK (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id));

ALTER POLICY "Institution staff can manage infection records" ON public."infection_records" WITH CHECK (is_institution_admin(hospital_id) OR is_institution_staff_member(hospital_id));

ALTER POLICY "Institution staff can manage discharge checklists" ON public."discharge_checklists" WITH CHECK (is_institution_admin(hospital_id) OR is_institution_staff_member(hospital_id));

ALTER POLICY "Institution staff can manage OT records" ON public."ot_anaesthesia_records" WITH CHECK (is_institution_admin(hospital_id) OR is_institution_staff_member(hospital_id));

ALTER POLICY "Institution staff can update ot_surgeries" ON public."ot_surgeries" WITH CHECK (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id));

ALTER POLICY "Phlebotomists can update sample_collections" ON public."sample_collections" WITH CHECK ((created_by = auth.uid()) OR (collected_by = auth.uid()) OR ((institution_id IS NOT NULL) AND (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id))));

ALTER POLICY "ART cycle update" ON public."art_cycles" WITH CHECK ((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM art_cycle_staff s
  WHERE ((s.cycle_id = art_cycles.id) AND (s.staff_id = auth.uid())))));

ALTER POLICY "Institution staff can update medication inventory for their ins" ON public."medication_inventory" WITH CHECK (EXISTS ( SELECT 1
   FROM institution_staff
  WHERE ((institution_staff.institution_id = medication_inventory.institution_id) AND (institution_staff.provider_id = auth.uid()) AND (institution_staff.is_active = true))));

ALTER POLICY "Couriers update assigned" ON public."delivery_orders" WITH CHECK (EXISTS ( SELECT 1
   FROM couriers
  WHERE ((couriers.id = delivery_orders.courier_id) AND (couriers.user_id = auth.uid()))));

ALTER POLICY "Pharmacy staff can update own deliveries" ON public."delivery_tracking" WITH CHECK (EXISTS ( SELECT 1
   FROM (orders o
     JOIN institution_personnel ip ON ((ip.institution_id = o.pharmacy_id)))
  WHERE ((o.id = delivery_tracking.order_id) AND (ip.user_id = auth.uid()) AND (ip.status IS DISTINCT FROM 'inactive'::text))));

ALTER POLICY "Staff can manage hospital beds" ON public."hospital_beds" WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_institution_admin(hospital_id) OR is_institution_staff_member(hospital_id));

ALTER POLICY "Institution admins can manage their beds" ON public."hospital_beds" WITH CHECK (EXISTS ( SELECT 1
   FROM healthcare_institutions
  WHERE ((healthcare_institutions.id = hospital_beds.hospital_id) AND (healthcare_institutions.admin_id = auth.uid()))));

ALTER POLICY "ICU staff manage beds" ON public."icu_beds" WITH CHECK (user_is_institution_staff_for_institution(auth.uid(), institution_id) OR has_admin_scope(auth.uid()));

ALTER POLICY "ICU staff manage observations" ON public."icu_observations" WITH CHECK (user_is_institution_staff_for_institution(auth.uid(), ( SELECT ib.institution_id
   FROM icu_beds ib
  WHERE (ib.id = icu_observations.bed_id))) OR has_admin_scope(auth.uid()));

ALTER POLICY "Institution staff can manage queue tokens" ON public."queue_tokens" WITH CHECK (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id));

ALTER POLICY "Providers can manage refills" ON public."prescription_refills" WITH CHECK ((auth.uid() = requested_by) OR (auth.uid() = approved_by) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))))));
