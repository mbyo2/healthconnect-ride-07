
-- Seed staff roles for remaining specialties
INSERT INTO public.specialty_staff_roles (specialty_id, role_name, description, requires_license, is_clinical) VALUES
  -- Cardiology
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Cardiology'), 'Cardiologist', 'Heart and cardiovascular specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Cardiology'), 'Cardiac Nurse', 'Specialized cardiac nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Cardiology'), 'Cardiac Technician', 'ECG, echo, and stress test operator', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Cardiology'), 'Cardiac Sonographer', 'Echocardiogram specialist', true, true),
  -- Pediatrics
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pediatrics'), 'Pediatrician', 'Child health physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pediatrics'), 'Pediatric Nurse', 'Specialized child nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pediatrics'), 'Child Psychologist', 'Child behavioral and developmental specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Pediatrics'), 'Pediatric Nutritionist', 'Child nutrition and dietary planning', true, true),
  -- Orthopedics
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Orthopedics'), 'Orthopedic Surgeon', 'Bone and joint surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Orthopedics'), 'Orthopedic Nurse', 'Musculoskeletal nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Orthopedics'), 'Orthopedic Technician', 'Casts, splints, and prosthetic fitting', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Orthopedics'), 'Chiropractor', 'Spinal and joint adjustment specialist', true, true),
  -- ENT
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'ENT (Ear Nose Throat)'), 'ENT Surgeon', 'Ear, nose, and throat surgeon', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'ENT (Ear Nose Throat)'), 'ENT Specialist', 'ENT diagnostics and treatment', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'ENT (Ear Nose Throat)'), 'Audiologist', 'Hearing assessment and rehabilitation', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'ENT (Ear Nose Throat)'), 'Speech Therapist', 'Speech and language rehabilitation', true, true),
  -- Mental Health / Counseling
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Mental Health / Counseling'), 'Psychiatrist', 'Mental health physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Mental Health / Counseling'), 'Psychologist', 'Psychological assessment and therapy', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Mental Health / Counseling'), 'Counselor', 'Licensed professional counselor', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Mental Health / Counseling'), 'Psychiatric Nurse', 'Mental health nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Mental Health / Counseling'), 'Social Worker', 'Clinical social work and support', true, true),
  -- Gynecology / Women Health
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gynecology / Women Health'), 'Gynecologist', 'Women reproductive health specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gynecology / Women Health'), 'Obstetrician', 'Pregnancy and childbirth specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gynecology / Women Health'), 'Midwife', 'Prenatal, birth, and postnatal care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Gynecology / Women Health'), 'Women Health Nurse', 'Specialized women health nursing', true, true),
  -- Urology
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Urology'), 'Urologist', 'Urinary and male reproductive specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Urology'), 'Urology Nurse', 'Specialized urological nursing care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Urology'), 'Urology Technician', 'Urodynamics and diagnostic procedures', true, true),
  -- Laboratory Services
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Laboratory Services'), 'Pathologist', 'Laboratory medicine specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Laboratory Services'), 'Lab Technologist', 'Medical laboratory testing', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Laboratory Services'), 'Phlebotomist', 'Blood collection specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Laboratory Services'), 'Lab Assistant', 'Sample processing and preparation', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Laboratory Services'), 'Microbiologist', 'Microbiology and culture analysis', true, true)
ON CONFLICT (specialty_id, role_name) DO NOTHING;
