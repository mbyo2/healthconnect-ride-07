-- Seed default departments at institution signup (in the trigger, not just frontend)
--
-- The frontend provisioning (institutionProvisioning.ts) is fire-and-forget and
-- runs in the background. The Pilot Test Clinic signup proved it doesn't run
-- reliably — 0 departments were created.
--
-- This updates auto_create_provider_application() to seed departments
-- atomically with the institution INSERT, so every signup gets its HMS
-- workspace from day one.
--
-- Department definitions mirror DEFAULT_DEPARTMENTS in
-- src/config/facilityProfiles.ts. If that file changes, update this function.
--
-- Discovered 2026-10-01 during end-to-end institution signup testing.

CREATE OR REPLACE FUNCTION public.auto_create_provider_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
 DECLARE
 v_raw_role text;
 v_license text;
 v_specialty text;
 v_business_name text;
 v_business_type text;
 v_inst_type healthcare_provider_type;
 v_inst_id uuid;
 v_archetype text;
 BEGIN
 v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
 IF v_raw_role = 'patient' THEN
 RETURN NEW;
 END IF;
 v_license := COALESCE(NEW.raw_user_meta_data->>'license_number', '');
 v_specialty := COALESCE(NEW.raw_user_meta_data->>'specialty', v_raw_role);
 v_business_name := NEW.raw_user_meta_data->>'business_name';
 v_business_type := NEW.raw_user_meta_data->>'business_type';
 IF EXISTS (
 SELECT 1 FROM public.provider_types pt
 WHERE pt.code = v_raw_role AND pt.is_active
 ) THEN
 INSERT INTO public.health_personnel_applications (
 user_id, license_number, specialty, years_of_experience, status, experience_level
 ) VALUES (
 NEW.id, v_license, v_specialty, 0, 'pending', 'entry'
 ) ON CONFLICT (user_id) DO NOTHING;
 END IF;
 IF v_raw_role IN ('pharmacy', 'lab', 'institution_admin') AND v_business_name IS NOT NULL THEN
 v_inst_type :=
 CASE v_business_type
 WHEN 'pharmacy' THEN 'pharmacy'
 WHEN 'clinic' THEN 'clinic'
 WHEN 'specialized_clinic' THEN 'specialty_clinic'
 WHEN 'hospital' THEN 'hospital'
 WHEN 'large_hospital' THEN 'hospital'
 WHEN 'laboratory' THEN 'radiology_center'
 WHEN 'nursing_home' THEN 'nursing_home'
 WHEN 'diagnostic_center' THEN 'radiology_center'
 ELSE 'clinic'
 END::healthcare_provider_type;

 INSERT INTO public.healthcare_institutions (
 admin_id, name, type, city, country, is_verified, license_number
 ) VALUES (
 NEW.id,
 v_business_name,
 v_inst_type,
 COALESCE(NEW.raw_user_meta_data->>'city', ''),
 COALESCE(NEW.raw_user_meta_data->>'country', 'Zambia'),
 false,
 v_license
 )
 ON CONFLICT (admin_id, name) DO NOTHING
 RETURNING id INTO v_inst_id;

 -- If the institution was newly created (not a conflict), seed departments.
 -- Map the stored type to the facility archetype.
 IF v_inst_id IS NOT NULL THEN
 v_archetype :=
 CASE v_inst_type::text
 WHEN 'pharmacy' THEN 'pharmacy'
 WHEN 'clinic' THEN 'clinic'
 WHEN 'specialty_clinic' THEN 'specialty_hospital'
 WHEN 'hospital' THEN 'general_hospital'
 WHEN 'radiology_center' THEN 'diagnostics'
 WHEN 'nursing_home' THEN 'long_term_care'
 ELSE 'clinic'
 END;

 -- clinic (5)
 IF v_archetype = 'clinic' THEN
 INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
 (v_inst_id, 'Outpatient (OPD)', 'OPD', 'General outpatient consultations', 0, true),
 (v_inst_id, 'Triage & Vitals', 'TRIAGE', 'Nurse-led triage station', 0, true),
 (v_inst_id, 'Laboratory', 'LAB', 'Point-of-care testing', 0, true),
 (v_inst_id, 'Dispensary', 'DISP', 'Medicine dispensing', 0, true),
 (v_inst_id, 'Accounts', 'ACCT', 'Billing & receipts', 0, true);
 -- pharmacy (4)
 ELSIF v_archetype = 'pharmacy' THEN
 INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
 (v_inst_id, 'Prescription Counter', 'RX', 'Prescription receiving & review', 0, true),
 (v_inst_id, 'OTC & Retail', 'OTC', 'Over-the-counter sales floor', 0, true),
 (v_inst_id, 'Stores', 'STORE', 'Stock room & cold chain', 0, true),
 (v_inst_id, 'Accounts', 'ACCT', 'POS billing & receipts', 0, true);
 -- diagnostics (6)
 ELSIF v_archetype = 'diagnostics' THEN
 INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
 (v_inst_id, 'Reception & Sample Collection', 'RECEP', 'Registration & phlebotomy', 0, true),
 (v_inst_id, 'Haematology', 'HAEM', 'Blood testing bench', 0, true),
 (v_inst_id, 'Microbiology', 'MICRO', 'Culture & sensitivity bench', 0, true),
 (v_inst_id, 'Imaging', 'IMG', 'X-ray & ultrasound suites', 0, true),
 (v_inst_id, 'Results & Reporting', 'REP', 'Verification & release desk', 0, true),
 (v_inst_id, 'Accounts', 'ACCT', 'Billing & receipts', 0, true);
 -- long_term_care (5)
 ELSIF v_archetype = 'long_term_care' THEN
 INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
 (v_inst_id, 'Residential Wing A', 'WING-A', 'Long-stay resident beds', 0, true),
 (v_inst_id, 'Residential Wing B', 'WING-B', 'Long-stay resident beds', 0, true),
 (v_inst_id, 'Nursing Station', 'NURSE', 'Care rounds & medication rounds', 0, true),
 (v_inst_id, 'Therapy Room', 'THER', 'Physio & occupational therapy', 0, true),
 (v_inst_id, 'Accounts', 'ACCT', 'Monthly billing & receipts', 0, true);
 -- specialty_hospital (7)
 ELSIF v_archetype = 'specialty_hospital' THEN
 INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
 (v_inst_id, 'Specialist Clinic', 'SPEC', 'Specialty outpatient clinic', 0, true),
 (v_inst_id, 'Day Ward', 'DAY', 'Day-case admissions', 0, true),
 (v_inst_id, 'Theatre', 'OT', 'Procedure / operating theatre', 0, true),
 (v_inst_id, 'Laboratory', 'LAB', 'In-house laboratory', 0, true),
 (v_inst_id, 'Imaging', 'IMG', 'X-ray & ultrasound', 0, true),
 (v_inst_id, 'Pharmacy', 'PHARM', 'In-house pharmacy', 0, true),
 (v_inst_id, 'Accounts', 'ACCT', 'Billing & insurance', 0, true);
 -- general_hospital (11)
 ELSIF v_archetype = 'general_hospital' THEN
 INSERT INTO public.hospital_departments (hospital_id, name, code, description, bed_capacity, is_active) VALUES
 (v_inst_id, 'Casualty / Emergency', 'A&E', '24h emergency receiving', 0, true),
 (v_inst_id, 'Outpatient (OPD)', 'OPD', 'General & specialist clinics', 0, true),
 (v_inst_id, 'Male Ward', 'MW', 'Male admissions', 0, true),
 (v_inst_id, 'Female Ward', 'FW', 'Female admissions', 0, true),
 (v_inst_id, 'Paediatric Ward', 'PAED', 'Children''s admissions', 0, true),
 (v_inst_id, 'Maternity / Labour', 'MAT', 'Labour, delivery & postnatal', 0, true),
 (v_inst_id, 'Theatre', 'OT', 'Operating theatres', 0, true),
 (v_inst_id, 'Laboratory', 'LAB', 'Central laboratory', 0, true),
 (v_inst_id, 'Imaging', 'IMG', 'Radiology & imaging', 0, true),
 (v_inst_id, 'Pharmacy', 'PHARM', 'Main pharmacy & stores', 0, true),
 (v_inst_id, 'Accounts', 'ACCT', 'Billing, NHIMA & insurance', 0, true);
 END IF;
 END IF;
 END IF;
 RETURN NEW;
 END;
 $function$;
