# Doc'O Clock — Production Supabase Schema Reference

Audited live 2026-09-25 via read-only SQL (project tthzcijscedgxjfnfnky).
**Rule: read this before writing any RLS policy, migration, or schema-dependent code.**
Repo migration files do NOT reflect the full live schema.

## Scale
- **318 tables** in `public`. HMS/EHR depth is real: admissions, beds, billing,
  payroll, pharmacy, lab, radiology, OT, ambulance, blood bank, payroll, ZRA
  smart-invoice, NHIMA/NHIS configs, etc.

## Enums (verified live)
- `app_role` (45), `user_role` (45): full HPCZ/NMCZ/ZAMRA/MOH taxonomy —
  patient, health_personnel, doctor, specialist, medical_licentiate,
  clinical_officer, dentist, dental_therapist, nurse, registered_nurse,
  enrolled_nurse, midwife, pharmacist, pharmacy_technologist,
  wholesale_pharmacy, radiologist, radiographer, pathologist, lab_technician,
  lab, physiotherapist, occupational_therapist, nutritionist, optometrist,
  psychologist, environmental_health_officer, community_health_worker,
  traditional_practitioner, medical_records_officer, receptionist, hr_manager,
  cxo, ot_staff, billing_staff, inventory_manager, triage_staff,
  maintenance_manager, ambulance_staff, institution_admin, institution_staff,
  pharmacy, admin, support, super_admin
- `healthcare_provider_type` (17 after 2026-09-25 migration): doctor, nurse,
  hospital, clinic, pharmacy, nursing_home, dentist, optician,
  dermatology_clinic, physiotherapy, radiology_center, eye_clinic, skin_clinic,
  dental_clinic, specialty_clinic, **laboratory**, **wholesale_pharmacy**
  - ⚠️ `healthcare_institutions.type` uses THIS enum. Values like
    `retail_pharmacy`, `imaging_centre` are INVALID and fail INSERTs.

## Reference tables (modular taxonomy — signup/staff pickers read these)
| Table | Rows (2026-09-25) | Notes |
|---|---|---|
| `provider_types` | 25 | HPCZ/NMCZ cadres, anon SELECT open |
| `institution_types` | 37 | MOH pyramid + private + ZAMRA, anon SELECT open |
| `clinic_specialty_catalog` | 46 | Zocdoc-breadth specialties, anon SELECT open |
| `specialty_staff_roles` | 77+ | roles per specialty, anon SELECT open |
| `institution_specialties` | 0 | junction table exists, not yet populated by UI |

## Critical column facts (gotchas that caused real bugs)
- `appointments` uses **`provider_id`** (uuid) — there is NO `doctor_id` column.
  Other columns: patient_id, date, time, status, type, notes, duration,
  institution_id, appointment_date, appointment_time, appointment_type,
  patient_visit_type, reminder_sent_at.
- `health_personnel_applications`: id, user_id, license_number, specialty,
  years_of_experience, status, created_at, updated_at, reviewed_by,
  reviewed_at, review_notes, experience_level, documents_url.

## RLS highlights
- `profiles`: 8 policies incl. "Appointment participants can view each other's
  profiles" (uses SECURITY DEFINER `user_shares_appointment_with` — NEVER
  query `appointments` directly from a profiles policy: infinite recursion).
- `healthcare_institutions`: 11 policies incl. self-provisioning INSERT
  (`admin_id = auth.uid()`).
- `institution_staff`: 11 policies; managers manage staff via SECURITY DEFINER
  `user_manages_institution()`.
- `medication_inventory`: 8 policies, all gated on `user_manages_institution()`.
- `lab_test_catalog`: "Lab staff can manage test catalog" (ALL) — role-based,
  no institution scoping yet (scaling risk: add institution_id).

## Profiles triggers (anti-escalation — do NOT fight these with SQL)
- `prevent_role_escalation_trigger`, `trg_prevent_profile_privilege_change`
  (only `is_service_role()` may change privileges),
  `trg_prevent_profile_self_elevation` — all BEFORE UPDATE.
- Role changes MUST go through app flows (e.g. approving a
  `health_personnel_applications` row fires a SECURITY DEFINER trigger that
  sets the role).

## Helper functions (SECURITY DEFINER)
- `user_manages_institution(uuid)`, `user_shares_appointment_with(uuid, uuid)`,
  `has_role(uuid, text)`, `is_service_role()`

## Auth metadata
- App signups store `role`, `business_name`, `business_type` in
  `raw_user_meta_data`. QA accounts created outside the app may have NULL
  metadata and default to `patient`.
