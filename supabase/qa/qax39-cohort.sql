-- QAX39 QA cohort setup — run in Supabase dashboard SQL editor, one statement at a time.
-- Creates: doctor, patient, pharmacist, lab tech, receptionist, institution admin,
-- plus QAX39 Pharmacy and QAX39 Clinic institutions with staff links.
-- All passwords: QAX39Test!
-- NOTE: appointments table has legacy NOT NULL date/time/type columns alongside
-- appointment_date/appointment_time/appointment_type — set both sets on insert.

-- ============ DOCTOR ============
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('a39d0c01-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qax39.doctor@example.com', crypt('QAX39Test!', gen_salt('bf', 6)), now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a39d0c01-0000-4000-a000-000000000001', jsonb_build_object('sub', 'a39d0c01-0000-4000-a000-000000000001', 'email', 'qax39.doctor@example.com'), 'email', 'a39d0c01-0000-4000-a000-000000000001', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES ('a39d0c01-0000-4000-a000-000000000001', 'qax39.doctor@example.com', 'QAX39', 'Doctor', 'doctor')
ON CONFLICT (id) DO UPDATE SET first_name='QAX39', last_name='Doctor', role='doctor';

INSERT INTO public.user_roles (user_id, role) VALUES ('a39d0c01-0000-4000-a000-000000000001', 'doctor'::app_role)
ON CONFLICT DO NOTHING;

-- ============ PATIENT ============
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('a39d0c01-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qax39.patient@example.com', crypt('QAX39Test!', gen_salt('bf', 6)), now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a39d0c01-0000-4000-a000-000000000002', jsonb_build_object('sub', 'a39d0c01-0000-4000-a000-000000000002', 'email', 'qax39.patient@example.com'), 'email', 'a39d0c01-0000-4000-a000-000000000002', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES ('a39d0c01-0000-4000-a000-000000000002', 'qax39.patient@example.com', 'QAX39', 'Patient', 'patient')
ON CONFLICT (id) DO UPDATE SET first_name='QAX39', last_name='Patient', role='patient';

INSERT INTO public.user_roles (user_id, role) VALUES ('a39d0c01-0000-4000-a000-000000000002', 'patient'::app_role)
ON CONFLICT DO NOTHING;

-- ============ PHARMACIST ============
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('a39d0c01-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qax39.pharmacist@example.com', crypt('QAX39Test!', gen_salt('bf', 6)), now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a39d0c01-0000-4000-a000-000000000003', jsonb_build_object('sub', 'a39d0c01-0000-4000-a000-000000000003', 'email', 'qax39.pharmacist@example.com'), 'email', 'a39d0c01-0000-4000-a000-000000000003', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES ('a39d0c01-0000-4000-a000-000000000003', 'qax39.pharmacist@example.com', 'QAX39', 'Pharmacist', 'pharmacist')
ON CONFLICT (id) DO UPDATE SET first_name='QAX39', last_name='Pharmacist', role='pharmacist';

INSERT INTO public.user_roles (user_id, role) VALUES ('a39d0c01-0000-4000-a000-000000000003', 'pharmacist'::app_role)
ON CONFLICT DO NOTHING;

-- ============ LAB TECH ============
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('a39d0c01-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qax39.labtech@example.com', crypt('QAX39Test!', gen_salt('bf', 6)), now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a39d0c01-0000-4000-a000-000000000004', jsonb_build_object('sub', 'a39d0c01-0000-4000-a000-000000000004', 'email', 'qax39.labtech@example.com'), 'email', 'a39d0c01-0000-4000-a000-000000000004', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES ('a39d0c01-0000-4000-a000-000000000004', 'qax39.labtech@example.com', 'QAX39', 'LabTech', 'lab_technician')
ON CONFLICT (id) DO UPDATE SET first_name='QAX39', last_name='LabTech', role='lab_technician';

INSERT INTO public.user_roles (user_id, role) VALUES ('a39d0c01-0000-4000-a000-000000000004', 'lab_technician'::app_role)
ON CONFLICT DO NOTHING;

-- ============ RECEPTIONIST ============
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('a39d0c01-0000-4000-a000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qax39.receptionist@example.com', crypt('QAX39Test!', gen_salt('bf', 6)), now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a39d0c01-0000-4000-a000-000000000005', jsonb_build_object('sub', 'a39d0c01-0000-4000-a000-000000000005', 'email', 'qax39.receptionist@example.com'), 'email', 'a39d0c01-0000-4000-a000-000000000005', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES ('a39d0c01-0000-4000-a000-000000000005', 'qax39.receptionist@example.com', 'QAX39', 'Receptionist', 'receptionist')
ON CONFLICT (id) DO UPDATE SET first_name='QAX39', last_name='Receptionist', role='receptionist';

INSERT INTO public.user_roles (user_id, role) VALUES ('a39d0c01-0000-4000-a000-000000000005', 'receptionist'::app_role)
ON CONFLICT DO NOTHING;

-- ============ INSTITUTION ADMIN ============
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('a39d0c01-0000-4000-a000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qax39.instadmin@example.com', crypt('QAX39Test!', gen_salt('bf', 6)), now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a39d0c01-0000-4000-a000-000000000006', jsonb_build_object('sub', 'a39d0c01-0000-4000-a000-000000000006', 'email', 'qax39.instadmin@example.com'), 'email', 'a39d0c01-0000-4000-a000-000000000006', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES ('a39d0c01-0000-4000-a000-000000000006', 'qax39.instadmin@example.com', 'QAX39', 'InstAdmin', 'institution_admin')
ON CONFLICT (id) DO UPDATE SET first_name='QAX39', last_name='InstAdmin', role='institution_admin';

INSERT INTO public.user_roles (user_id, role) VALUES ('a39d0c01-0000-4000-a000-000000000006', 'institution_admin'::app_role)
ON CONFLICT DO NOTHING;

-- ============ APPOINTMENT (doctor <-> patient) ============
INSERT INTO public.appointments (patient_id, provider_id, date, time, type, appointment_date, appointment_time, status, appointment_type)
VALUES ('a39d0c01-0000-4000-a000-000000000002', 'a39d0c01-0000-4000-a000-000000000001', CURRENT_DATE + 1, '09:00', 'in_person', CURRENT_DATE + 1, '09:00', 'scheduled', 'in_person')
ON CONFLICT DO NOTHING;

-- ============ INSTITUTIONS (introspect required cols first if these fail) ============
INSERT INTO public.healthcare_institutions (id, name, type, admin_id)
VALUES ('b39d0c01-0000-4000-b000-000000000001', 'QAX39 Pharmacy', 'pharmacy', 'a39d0c01-0000-4000-a000-000000000006')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.healthcare_institutions (id, name, type, admin_id)
VALUES ('b39d0c01-0000-4000-b000-000000000002', 'QAX39 Clinic', 'clinic', 'a39d0c01-0000-4000-a000-000000000006')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.institution_staff (institution_id, provider_id, role, is_active)
VALUES ('b39d0c01-0000-4000-b000-000000000001', 'a39d0c01-0000-4000-a000-000000000003', 'pharmacist', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.institution_staff (institution_id, provider_id, role, is_active)
VALUES ('b39d0c01-0000-4000-b000-000000000002', 'a39d0c01-0000-4000-a000-000000000005', 'receptionist', true)
ON CONFLICT DO NOTHING;

-- ============ VERIFY ============
-- SELECT email, first_name, last_name FROM public.profiles WHERE email LIKE 'qax39.%' ORDER BY email;
-- SELECT id, name, type FROM public.healthcare_institutions WHERE id LIKE 'b39d0c01-%';
