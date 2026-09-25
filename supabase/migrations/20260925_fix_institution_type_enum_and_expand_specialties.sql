-- ============================================================================
-- Fix institution type enum gaps + expand specialty catalog (Zocdoc breadth)
-- Run in Supabase SQL Editor. Safe to re-run (all statements idempotent).
--
-- 1. healthcare_provider_type enum was missing 'laboratory' and
--    'wholesale_pharmacy', so useInstitutionContext() auto-provisioning
--    INSERTs for lab/pharmacy roles failed with an invalid-enum error and the
--    app fell back to a fake in-memory institution -> downstream RLS failures
--    (e.g. medication_inventory "new row violates row-level security policy").
-- 2. Expands clinic_specialty_catalog from 14 to 46 specialties and seeds
--    specialty_staff_roles for each new specialty. Signup + staff-management
--    pickers read these tables, so new specialties/roles are data-only adds.
-- ============================================================================

-- ─── 1. Enum gaps ──────────────────────────────────────────────────────────
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'laboratory';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'wholesale_pharmacy';

-- ─── 2. Specialty catalog expansion ────────────────────────────────────────
INSERT INTO public.clinic_specialty_catalog (name, description, icon_name) VALUES
  ('Allergy & Immunology', 'Allergy testing and immune system disorders', 'Shield'),
  ('Anesthesiology', 'Anesthesia and perioperative care', 'Syringe'),
  ('Emergency Medicine', '24/7 emergency and trauma care', 'Siren'),
  ('Endocrinology & Diabetes', 'Hormone disorders and diabetes care', 'Droplet'),
  ('Family Medicine', 'Comprehensive care for all ages', 'Users'),
  ('Gastroenterology', 'Digestive system disorders', 'Activity'),
  ('General Surgery', 'Surgical procedures and operations', 'Scissors'),
  ('Geriatric Medicine', 'Healthcare for older adults', 'HeartHandshake'),
  ('Hematology', 'Blood disorders and transfusion medicine', 'Droplets'),
  ('Infectious Diseases', 'Infections and communicable diseases', 'Bug'),
  ('Internal Medicine', 'Adult primary and complex medical care', 'Stethoscope'),
  ('Nephrology', 'Kidney care and dialysis', 'Filter'),
  ('Neurology', 'Brain and nervous system disorders', 'Brain'),
  ('Neurosurgery', 'Brain and spine surgery', 'Brain'),
  ('Nuclear Medicine', 'Molecular imaging and targeted therapy', 'Radiation'),
  ('Oncology', 'Cancer diagnosis and treatment', 'Cross'),
  ('Oral & Maxillofacial Surgery', 'Jaw, face and mouth surgery', 'Smile'),
  ('Pediatric Surgery', 'Surgical care for children', 'Baby'),
  ('Neonatology', 'Newborn intensive care', 'Baby'),
  ('Plastic & Reconstructive Surgery', 'Reconstructive and cosmetic surgery', 'Sparkles'),
  ('Podiatry', 'Foot and ankle care', 'Footprints'),
  ('Pulmonology', 'Lung and respiratory care', 'Wind'),
  ('Rheumatology', 'Arthritis and autoimmune joint disease', 'Bone'),
  ('Vascular Surgery', 'Blood vessel surgery', 'Activity'),
  ('Thoracic Surgery', 'Chest and lung surgery', 'Wind'),
  ('Colorectal Surgery', 'Colon and rectal surgery', 'Scissors'),
  ('Sleep Medicine', 'Sleep disorders diagnosis and treatment', 'Moon'),
  ('Sports Medicine', 'Athletic injuries and performance care', 'Trophy'),
  ('Critical Care', 'Intensive care medicine', 'HeartPulse'),
  ('Fertility & Reproductive Medicine', 'IVF and fertility treatment', 'Heart'),
  ('Wound Care', 'Chronic and complex wound management', 'Bandage'),
  ('Occupational Medicine', 'Workplace health and injury care', 'Briefcase')
ON CONFLICT (name) DO NOTHING;

-- ─── 3. Staff roles for the new specialties ────────────────────────────────
INSERT INTO public.specialty_staff_roles (specialty_id, role_name, description, requires_license, is_clinical) VALUES
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Allergy & Immunology'), 'Allergist', 'Allergy diagnosis and treatment', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Allergy & Immunology'), 'Immunologist', 'Immune system disorders', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Allergy & Immunology'), 'Allergy Nurse', 'Allergy testing and shots', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Anesthesiology'), 'Anesthesiologist', 'Anesthesia administration', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Anesthesiology'), 'Nurse Anesthetist', 'Assists with anesthesia care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Anesthesiology'), 'Anesthesia Technician', 'Anesthesia equipment support', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Emergency Medicine'), 'Emergency Physician', 'Emergency diagnosis and stabilization', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Emergency Medicine'), 'Emergency Nurse', 'Emergency nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Emergency Medicine'), 'Paramedic', 'Pre-hospital emergency care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Emergency Medicine'), 'Triage Officer', 'Patient prioritization at intake', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Endocrinology & Diabetes'), 'Endocrinologist', 'Hormone disorder specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Endocrinology & Diabetes'), 'Diabetes Educator', 'Diabetes self-management training', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Endocrinology & Diabetes'), 'Diabetes Nurse', 'Diabetes nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Family Medicine'), 'Family Physician', 'Whole-family primary care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Family Medicine'), 'Family Nurse', 'Family nursing support', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gastroenterology'), 'Gastroenterologist', 'Digestive disease specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gastroenterology'), 'Endoscopy Nurse', 'Endoscopy nursing support', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gastroenterology'), 'Endoscopy Technician', 'Endoscopy equipment support', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Surgery'), 'General Surgeon', 'General surgical procedures', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Surgery'), 'Surgical Nurse', 'Perioperative nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Surgery'), 'Surgical Technician', 'Operating theatre support', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Geriatric Medicine'), 'Geriatrician', 'Older-adult care specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Geriatric Medicine'), 'Geriatric Nurse', 'Elderly nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Geriatric Medicine'), 'Caregiver', 'Daily living assistance', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Hematology'), 'Hematologist', 'Blood disorder specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Hematology'), 'Hematology Nurse', 'Blood disorder nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Infectious Diseases'), 'Infectious Disease Specialist', 'Complex infection care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Infectious Diseases'), 'Infection Control Nurse', 'Infection prevention', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Internal Medicine'), 'Internist', 'Adult internal medicine', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Internal Medicine'), 'Internal Medicine Nurse', 'Adult medical nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Nephrology'), 'Nephrologist', 'Kidney disease specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Nephrology'), 'Dialysis Nurse', 'Dialysis nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Nephrology'), 'Dialysis Technician', 'Dialysis machine operation', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neurology'), 'Neurologist', 'Nervous system specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neurology'), 'Neurology Nurse', 'Neurological nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neurology'), 'EEG Technician', 'Brain activity testing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neurosurgery'), 'Neurosurgeon', 'Brain and spine surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neurosurgery'), 'Neurosurgical Nurse', 'Neurosurgery nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Nuclear Medicine'), 'Nuclear Medicine Physician', 'Molecular imaging specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Nuclear Medicine'), 'Nuclear Medicine Technologist', 'Operates nuclear imaging equipment', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Oncology'), 'Oncologist', 'Cancer treatment specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Oncology'), 'Oncology Nurse', 'Cancer nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Oncology'), 'Radiation Therapist', 'Radiation treatment delivery', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Oral & Maxillofacial Surgery'), 'Maxillofacial Surgeon', 'Jaw and facial surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Oral & Maxillofacial Surgery'), 'Oral Surgery Assistant', 'Surgical chairside support', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pediatric Surgery'), 'Pediatric Surgeon', 'Children''s surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pediatric Surgery'), 'Pediatric Surgical Nurse', 'Children''s surgical nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neonatology'), 'Neonatologist', 'Newborn intensive care specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Neonatology'), 'Neonatal Nurse', 'Newborn intensive nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Plastic & Reconstructive Surgery'), 'Plastic Surgeon', 'Reconstructive surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Plastic & Reconstructive Surgery'), 'Aesthetic Nurse', 'Cosmetic procedure nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Podiatry'), 'Podiatrist', 'Foot and ankle specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Podiatry'), 'Podiatry Assistant', 'Foot care support', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pulmonology'), 'Pulmonologist', 'Lung disease specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pulmonology'), 'Respiratory Therapist', 'Breathing therapy', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pulmonology'), 'Pulmonary Nurse', 'Respiratory nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Rheumatology'), 'Rheumatologist', 'Arthritis and autoimmune specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Rheumatology'), 'Rheumatology Nurse', 'Rheumatology nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Vascular Surgery'), 'Vascular Surgeon', 'Blood vessel surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Vascular Surgery'), 'Vascular Nurse', 'Vascular nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Vascular Surgery'), 'Vascular Technician', 'Vascular imaging support', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Thoracic Surgery'), 'Thoracic Surgeon', 'Chest surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Thoracic Surgery'), 'Thoracic Nurse', 'Chest surgery nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Colorectal Surgery'), 'Colorectal Surgeon', 'Colon and rectal surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Colorectal Surgery'), 'Colorectal Nurse', 'Colorectal nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Sleep Medicine'), 'Sleep Specialist', 'Sleep disorder physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Sleep Medicine'), 'Sleep Technologist', 'Sleep study testing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Sports Medicine'), 'Sports Medicine Physician', 'Athletic injury physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Sports Medicine'), 'Athletic Trainer', 'Injury prevention and rehab', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Critical Care'), 'Intensivist', 'Intensive care physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Critical Care'), 'ICU Nurse', 'Intensive care nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Critical Care'), 'Critical Care Technician', 'ICU equipment support', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Fertility & Reproductive Medicine'), 'Fertility Specialist', 'Reproductive endocrinologist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Fertility & Reproductive Medicine'), 'Embryologist', 'IVF laboratory scientist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Fertility & Reproductive Medicine'), 'Fertility Nurse', 'Fertility treatment nursing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Wound Care'), 'Wound Care Specialist', 'Complex wound physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Wound Care'), 'Wound Care Nurse', 'Wound dressing and management', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Occupational Medicine'), 'Occupational Physician', 'Workplace health physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Occupational Medicine'), 'Occupational Health Nurse', 'Workplace health nursing', true, true)
ON CONFLICT (specialty_id, role_name) DO NOTHING;
