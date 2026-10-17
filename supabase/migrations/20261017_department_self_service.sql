-- Department self-service: unblock required-department flows
--
-- Problem: department is a REQUIRED field in admission, bed, OPD, IPD and
-- roster dialogs, but institutions created before the 2026-10-01 signup
-- seed (or via admin paths) have zero rows in hospital_departments, and
-- only institution admins could INSERT. Result: a required dropdown that
-- can never be satisfied, blocking admissions.
--
-- Fix (two parts):
-- 1. Allow active institution staff members to CREATE departments
--    (INSERT only — UPDATE/DELETE stay admin-only via the existing
--    "Admins can manage hospital departments" FOR ALL policy).
-- 2. Backfill default departments for institutions that currently have
--    none, using the same archetype mapping as the signup trigger
--    (20261001_seed_departments_in_signup_trigger.sql).

-- 1. Staff can create departments in their own institution.
DROP POLICY IF EXISTS "Staff can create hospital departments" ON public.hospital_departments;
CREATE POLICY "Staff can create hospital departments"
ON public.hospital_departments FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.is_institution_admin(hospital_id) OR
  public.is_institution_staff_member(hospital_id)
);

-- 2. Backfill: seed defaults for institutions with zero departments.
DO $$
DECLARE
  r RECORD;
  v_archetype text;
BEGIN
  FOR r IN
    SELECT hi.id, hi.type::text AS itype
    FROM public.healthcare_institutions hi
    WHERE NOT EXISTS (
      SELECT 1 FROM public.hospital_departments hd
      WHERE hd.hospital_id = hi.id
    )
  LOOP
    v_archetype :=
      CASE r.itype
        WHEN 'pharmacy' THEN 'pharmacy'
        WHEN 'clinic' THEN 'clinic'
        WHEN 'specialty_clinic' THEN 'specialty_hospital'
        WHEN 'hospital' THEN 'general_hospital'
        WHEN 'radiology_center' THEN 'diagnostics'
        WHEN 'nursing_home' THEN 'long_term_care'
        ELSE 'clinic'
      END;

    IF v_archetype = 'clinic' THEN
      INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
      (r.id, 'Outpatient (OPD)', 'OPD', 'General outpatient consultations', 0, true),
      (r.id, 'Triage & Vitals', 'TRIAGE', 'Nurse-led triage station', 0, true),
      (r.id, 'Laboratory', 'LAB', 'Point-of-care testing', 0, true),
      (r.id, 'Dispensary', 'DISP', 'Medicine dispensing', 0, true),
      (r.id, 'Accounts', 'ACCT', 'Billing & receipts', 0, true);
    ELSIF v_archetype = 'pharmacy' THEN
      INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
      (r.id, 'Prescription Counter', 'RX', 'Prescription receiving & review', 0, true),
      (r.id, 'OTC & Retail', 'OTC', 'Over-the-counter sales floor', 0, true),
      (r.id, 'Stores', 'STORE', 'Stock room & cold chain', 0, true),
      (r.id, 'Accounts', 'ACCT', 'POS billing & receipts', 0, true);
    ELSIF v_archetype = 'diagnostics' THEN
      INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
      (r.id, 'Reception & Sample Collection', 'RECEP', 'Registration & phlebotomy', 0, true),
      (r.id, 'Haematology', 'HAEM', 'Blood testing bench', 0, true),
      (r.id, 'Microbiology', 'MICRO', 'Culture & sensitivity bench', 0, true),
      (r.id, 'Imaging', 'IMG', 'X-ray & ultrasound suites', 0, true),
      (r.id, 'Results & Reporting', 'REP', 'Verification & release desk', 0, true),
      (r.id, 'Accounts', 'ACCT', 'Billing & receipts', 0, true);
    ELSIF v_archetype = 'long_term_care' THEN
      INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
      (r.id, 'Residential Wing A', 'WING-A', 'Long-stay resident beds', 0, true),
      (r.id, 'Residential Wing B', 'WING-B', 'Long-stay resident beds', 0, true),
      (r.id, 'Nursing Station', 'NURSE', 'Care rounds & medication rounds', 0, true),
      (r.id, 'Therapy Room', 'THER', 'Physio & occupational therapy', 0, true),
      (r.id, 'Accounts', 'ACCT', 'Monthly billing & receipts', 0, true);
    ELSIF v_archetype = 'specialty_hospital' THEN
      INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
      (r.id, 'Specialist Clinic', 'SPEC', 'Specialty outpatient clinic', 0, true),
      (r.id, 'Day Ward', 'DAY', 'Day-case admissions', 0, true),
      (r.id, 'Theatre', 'OT', 'Procedure / operating theatre', 0, true),
      (r.id, 'Laboratory', 'LAB', 'In-house laboratory', 0, true),
      (r.id, 'Imaging', 'IMG', 'X-ray & ultrasound', 0, true),
      (r.id, 'Pharmacy', 'PHARM', 'In-house pharmacy', 0, true),
      (r.id, 'Accounts', 'ACCT', 'Billing & insurance', 0, true);
    ELSIF v_archetype = 'general_hospital' THEN
      INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
      (r.id, 'Casualty / Emergency', 'A&E', '24h emergency receiving', 0, true),
      (r.id, 'Outpatient (OPD)', 'OPD', 'General & specialist clinics', 0, true),
      (r.id, 'Male Ward', 'MW', 'Male admissions', 0, true),
      (r.id, 'Female Ward', 'FW', 'Female admissions', 0, true),
      (r.id, 'Paediatric Ward', 'PAED', 'Children''s admissions', 0, true),
      (r.id, 'Maternity / Labour', 'MAT', 'Labour, delivery & postnatal', 0, true),
      (r.id, 'Theatre', 'OT', 'Operating theatres', 0, true),
      (r.id, 'Laboratory', 'LAB', 'Central laboratory', 0, true),
      (r.id, 'Imaging', 'IMG', 'Radiology & imaging', 0, true),
      (r.id, 'Pharmacy', 'PHARM', 'Main pharmacy & stores', 0, true),
      (r.id, 'Accounts', 'ACCT', 'Billing, NHIMA & insurance', 0, true);
    END IF;
  END LOOP;
END $$;
