-- ============================================================
-- Doc'O Clock — Full facility taxonomy + module charter
-- Covers every facility from community health posts up to
-- university/teaching hospitals and diagnostic centres.
--
-- 1. Adds the missing institution_types (Zambia's 4-level pyramid
--    + private/specialty/diagnostic facilities).
-- 2. Adds a `tier` column to institution_types so dashboards can be
--    scoped per facility tier without code changes.
-- 3. Creates facility_module_charter: every tier gets its modules
--    "chartered" (defined). status = 'live'  -> shipped in the app.
--    status = 'planned' -> chartered now, built later.
-- All statements are idempotent; safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New institution types
-- ------------------------------------------------------------
INSERT INTO public.institution_types (name, description, icon_name) VALUES
  -- Primary care (Zambia community level)
  ('rural_health_centre', 'Rural primary-care health centre', 'Home'),
  ('urban_health_centre', 'Urban primary-care health centre', 'Building2'),
  -- Hospital pyramid (Zambia levels 1-4)
  ('district_hospital', 'Level 1 district referral hospital', 'Building'),
  ('provincial_hospital', 'Level 2 provincial hospital', 'Building'),
  ('general_hospital', 'General multi-specialty hospital', 'Building'),
  ('central_hospital', 'Level 3 central/tertiary hospital', 'Building'),
  ('tertiary_hospital', 'Tertiary referral hospital', 'Building'),
  ('teaching_hospital', 'Teaching hospital with clinical training', 'GraduationCap'),
  ('university_hospital', 'University-affiliated academic hospital', 'GraduationCap'),
  ('specialized_hospital', 'Single-specialty specialized hospital', 'Stethoscope'),
  ('maternity_hospital', 'Maternity and obstetric hospital', 'Baby'),
  ('psychiatric_hospital', 'Psychiatric inpatient hospital', 'Brain'),
  ('childrens_hospital', 'Children''s hospital', 'Baby'),
  ('eye_hospital', 'Eye and ophthalmic hospital', 'Eye'),
  -- Diagnostics
  ('diagnostic_laboratory', 'Diagnostic medical laboratory', 'FlaskConical'),
  ('pathology_lab', 'Pathology and histology laboratory', 'Microscope'),
  ('radiology_centre', 'Radiology and medical imaging centre', 'Scan'),
  -- Surgical / specialty
  ('day_surgery_centre', 'Day-case surgery centre', 'Scissors'),
  ('surgical_centre', 'Surgical specialty centre', 'Syringe'),
  ('trauma_centre', 'Trauma and emergency centre', 'Siren'),
  ('fertility_clinic', 'Fertility and reproductive clinic', 'Heart'),
  ('vaccination_centre', 'Vaccination and immunization centre', 'Syringe'),
  ('health_screening_centre', 'Health screening and check-up centre', 'ClipboardCheck'),
  -- Pharmacy
  ('community_pharmacy', 'Community retail pharmacy', 'Pill')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Facility tiers (drives module visibility per facility)
-- ------------------------------------------------------------
ALTER TABLE public.institution_types
  ADD COLUMN IF NOT EXISTS tier text;

UPDATE public.institution_types SET tier = CASE name
  -- Community / outreach
  WHEN 'health_post' THEN 'community'
  WHEN 'mobile_clinic' THEN 'community'
  WHEN 'community_health' THEN 'community'
  -- Primary care
  WHEN 'rural_health_centre' THEN 'primary'
  WHEN 'urban_health_centre' THEN 'primary'
  WHEN 'clinic' THEN 'primary'
  WHEN 'specialty_clinic' THEN 'primary'
  WHEN 'polyclinic' THEN 'primary'
  WHEN 'dental_clinic' THEN 'primary'
  WHEN 'optical_center' THEN 'primary'
  WHEN 'physiotherapy_center' THEN 'primary'
  WHEN 'maternity_clinic' THEN 'primary'
  WHEN 'vaccination_centre' THEN 'primary'
  WHEN 'health_screening_centre' THEN 'primary'
  WHEN 'fertility_clinic' THEN 'primary'
  WHEN 'health_shop' THEN 'primary'
  WHEN 'wellness_center' THEN 'primary'
  WHEN 'telemedicine' THEN 'primary'
  -- Secondary hospitals & inpatient care
  WHEN 'hospital' THEN 'secondary'
  WHEN 'district_hospital' THEN 'secondary'
  WHEN 'provincial_hospital' THEN 'secondary'
  WHEN 'general_hospital' THEN 'secondary'
  WHEN 'nursing_home' THEN 'secondary'
  WHEN 'hospice_care' THEN 'secondary'
  WHEN 'emergency_center' THEN 'secondary'
  WHEN 'trauma_centre' THEN 'secondary'
  WHEN 'day_surgery_centre' THEN 'secondary'
  WHEN 'surgical_centre' THEN 'secondary'
  WHEN 'rehab_center' THEN 'secondary'
  WHEN 'mental_health' THEN 'secondary'
  -- Tertiary / academic hospitals
  WHEN 'central_hospital' THEN 'tertiary'
  WHEN 'tertiary_hospital' THEN 'tertiary'
  WHEN 'teaching_hospital' THEN 'tertiary'
  WHEN 'university_hospital' THEN 'tertiary'
  WHEN 'specialized_hospital' THEN 'tertiary'
  WHEN 'oncology_center' THEN 'tertiary'
  WHEN 'psychiatric_hospital' THEN 'tertiary'
  WHEN 'childrens_hospital' THEN 'tertiary'
  WHEN 'eye_hospital' THEN 'tertiary'
  WHEN 'maternity_hospital' THEN 'tertiary'
  WHEN 'dialysis_center' THEN 'tertiary'
  -- Diagnostics
  WHEN 'laboratory' THEN 'diagnostics'
  WHEN 'diagnostic_laboratory' THEN 'diagnostics'
  WHEN 'pathology_lab' THEN 'diagnostics'
  WHEN 'diagnostic_centre' THEN 'diagnostics'
  WHEN 'imaging_centre' THEN 'diagnostics'
  WHEN 'radiology_centre' THEN 'diagnostics'
  WHEN 'blood_bank' THEN 'diagnostics'
  -- Pharmacy
  WHEN 'pharmacy' THEN 'pharmacy'
  WHEN 'retail_pharmacy' THEN 'pharmacy'
  WHEN 'community_pharmacy' THEN 'pharmacy'
  WHEN 'hospital_pharmacy' THEN 'pharmacy'
  WHEN 'wholesale_pharmacy' THEN 'pharmacy'
  -- Support / non-clinical
  ELSE 'support'
END;

-- ------------------------------------------------------------
-- 3. Module charter: every tier's modules, chartered.
-- status: 'live' = shipped | 'planned' = chartered, built later.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facility_module_charter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  module_key text NOT NULL,
  module_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('live', 'planned')),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, module_key)
);

INSERT INTO public.facility_module_charter (tier, module_key, module_name, description, status, display_order) VALUES
  -- COMMUNITY: health posts, mobile clinics, community outreach
  ('community','patient_registration','Patient registration & records','Register patients and keep basic health records','live',1),
  ('community','appointments','Appointments & scheduling','Book and manage visits','live',2),
  ('community','telehealth','Telehealth consultations','Video consults with remote clinicians','live',3),
  ('community','triage','Triage & vital signs','Capture vitals and triage at point of care','planned',4),
  ('community','referrals','Referral network','Refer up/down the facility pyramid','planned',5),
  ('community','drug_stock','Essential drug stock','Track essential medicines stock','planned',6),

  -- PRIMARY: health centres, clinics, dental/optical/physio, screening
  ('primary','patient_registration','Patient registration & records','Register patients and keep health records','live',1),
  ('primary','appointments','Appointments & scheduling','Book and manage visits','live',2),
  ('primary','telehealth','Telehealth consultations','Video consults with remote clinicians','live',3),
  ('primary','opd','Outpatient consultations (OPD)','Outpatient visit workflows','live',4),
  ('primary','prescriptions','E-prescriptions','Write and manage electronic prescriptions','live',5),
  ('primary','laboratory','Laboratory orders & results','Order tests and receive results','live',6),
  ('primary','pharmacy','In-house dispensing','Dispense medicines on site','live',7),
  ('primary','billing','Billing & payments','Invoices, receipts and mobile-money payments','live',8),
  ('primary','maternal_child','ANC/PNC & immunization','Antenatal, postnatal and vaccination registers','planned',9),
  ('primary','referrals','Referral network','Refer up/down the facility pyramid','planned',10),
  ('primary','reports','Reports & analytics','Operational and clinical reports','planned',11),

  -- SECONDARY: district/provincial/general hospitals, nursing homes
  ('secondary','patient_registration','Patient registration & records','Register patients and keep health records','live',1),
  ('secondary','appointments','Appointments & scheduling','Book and manage visits','live',2),
  ('secondary','telehealth','Telehealth consultations','Video consults with remote clinicians','live',3),
  ('secondary','opd','Outpatient consultations (OPD)','Outpatient visit workflows','live',4),
  ('secondary','prescriptions','E-prescriptions','Write and manage electronic prescriptions','live',5),
  ('secondary','laboratory','Laboratory orders & results','Order tests and receive results','live',6),
  ('secondary','pharmacy','Hospital pharmacy','Dispense medicines and manage formulary','live',7),
  ('secondary','billing','Billing & payments','Invoices, receipts and mobile-money payments','live',8),
  ('secondary','hr_staff','HR & staff management','Staff records, roles and rosters','live',9),
  ('secondary','ipd_wards','Inpatient wards & beds','Admissions, wards and bed management','planned',10),
  ('secondary','emergency','Emergency & casualty','Accident & emergency workflows','planned',11),
  ('secondary','theatre','Operating theatre','Theatre booking and peri-operative care','planned',12),
  ('secondary','imaging','Imaging scheduling','Radiology orders and image viewing','planned',13),
  ('secondary','maternal_child','ANC/PNC & immunization','Antenatal, postnatal and vaccination registers','planned',14),
  ('secondary','blood_bank','Blood bank requests','Request and track blood products','planned',15),
  ('secondary','ambulance','Ambulance dispatch','Dispatch and track ambulances','planned',16),
  ('secondary','referrals','Referral network','Refer up/down the facility pyramid','planned',17),
  ('secondary','reports','Reports & analytics','Operational and clinical reports','planned',18),

  -- TERTIARY: central/teaching/university/specialized hospitals
  ('tertiary','patient_registration','Patient registration & records','Register patients and keep health records','live',1),
  ('tertiary','appointments','Appointments & scheduling','Book and manage visits','live',2),
  ('tertiary','telehealth','Telehealth consultations','Video consults with remote clinicians','live',3),
  ('tertiary','opd','Outpatient consultations (OPD)','Outpatient visit workflows','live',4),
  ('tertiary','prescriptions','E-prescriptions','Write and manage electronic prescriptions','live',5),
  ('tertiary','laboratory','Laboratory orders & results','Order tests and receive results','live',6),
  ('tertiary','pharmacy','Hospital pharmacy','Dispense medicines and manage formulary','live',7),
  ('tertiary','billing','Billing & payments','Invoices, receipts and mobile-money payments','live',8),
  ('tertiary','hr_staff','HR & staff management','Staff records, roles and rosters','live',9),
  ('tertiary','ipd_wards','Inpatient wards & beds','Admissions, wards and bed management','planned',10),
  ('tertiary','emergency','Emergency & casualty','Accident & emergency workflows','planned',11),
  ('tertiary','theatre','Operating theatre','Theatre booking and peri-operative care','planned',12),
  ('tertiary','imaging','Imaging scheduling','Radiology orders and image viewing','planned',13),
  ('tertiary','icu','ICU & critical care','Intensive-care bed and monitoring workflows','planned',14),
  ('tertiary','maternal_child','ANC/PNC & immunization','Antenatal, postnatal and vaccination registers','planned',15),
  ('tertiary','blood_bank','Blood bank requests','Request and track blood products','planned',16),
  ('tertiary','ambulance','Ambulance dispatch','Dispatch and track ambulances','planned',17),
  ('tertiary','teaching_research','Clinical teaching & research','Residency, student rotations and research','planned',18),
  ('tertiary','insurance','Insurance & medical-aid claims','Claims processing with insurers','planned',19),
  ('tertiary','referrals','Referral network','Refer up/down the facility pyramid','planned',20),
  ('tertiary','reports','Reports & analytics','Operational and clinical reports','planned',21),

  -- DIAGNOSTICS: labs, pathology, imaging centres, blood banks
  ('diagnostics','patient_registration','Patient registration & records','Register patients and keep health records','live',1),
  ('diagnostics','appointments','Appointments & scheduling','Book test appointments','live',2),
  ('diagnostics','laboratory','Test catalog & results','Manage test catalog, samples and results','live',3),
  ('diagnostics','imaging','Imaging scheduling','Radiology orders and image viewing','planned',4),
  ('diagnostics','billing','Billing & payments','Invoices, receipts and mobile-money payments','live',5),
  ('diagnostics','referrals','Referral network','Receive referrals from facilities','planned',6),
  ('diagnostics','reports','Reports & analytics','Operational and clinical reports','planned',7),

  -- PHARMACY: retail, community, hospital, wholesale
  ('pharmacy','pharmacy_inventory','Inventory & dispensing','Stock control and dispensing','live',1),
  ('pharmacy','prescriptions','E-prescriptions','Receive and fulfill electronic prescriptions','live',2),
  ('pharmacy','billing','Billing & payments','Invoices, receipts and mobile-money payments','live',3),
  ('pharmacy','appointments','Pharmacist consultations','Book medication-review consultations','live',4),
  ('pharmacy','procurement','Procurement & suppliers','Purchase orders and supplier management','planned',5),

  -- SUPPORT: ambulance, home care, research, insurers, NGOs
  ('support','patient_registration','Patient registration & records','Register patients and keep health records','live',1),
  ('support','appointments','Appointments & scheduling','Book and manage visits','live',2),
  ('support','referrals','Referral network','Coordinate with care facilities','planned',3),
  ('support','reports','Reports & analytics','Operational reports','planned',4)
ON CONFLICT (tier, module_key) DO NOTHING;
