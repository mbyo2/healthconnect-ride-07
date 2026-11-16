# Institution-type completion (54/54)

All 54 types created via the app's exact PostgREST insert path (HealthcareInstitutionForm payload) as QA institution admins, read back via JWT, tier + charter resolved live. Charter keys are the live facility_module_charter counts per tier (36 distinct keys pre-fix, 35 after the bloodbank canonicalisation; per-tier counts unchanged).

| Type code | Name | Tier | Admin | Charter keys (live) | Setup read-back |
|---|---|---|---|---|---|
| central_hospital | Central Hospital | tertiary | A | 31 (21 live) | PASS |
| general_hospital | General Hospital | secondary | B | 27 (18 live) | PASS |
| radiology_centre | Radiology Centre | diagnostics | A | 8 (8 live) | PASS |
| pathology_lab | Pathology Lab | diagnostics | B | 8 (8 live) | PASS |
| diagnostic_laboratory | Diagnostic Laboratory | diagnostics | A | 8 (8 live) | PASS |
| childrens_hospital | Children's Hospital | tertiary | B | 31 (21 live) | PASS |
| psychiatric_hospital | Psychiatric Hospital | tertiary | A | 31 (21 live) | PASS |
| specialized_hospital | Specialized Hospital | tertiary | B | 31 (21 live) | PASS |
| university_hospital | University Hospital | tertiary | A | 31 (21 live) | PASS |
| teaching_hospital | Teaching Hospital | tertiary | B | 31 (21 live) | PASS |
| community_pharmacy | Community Pharmacy | pharmacy | A | 5 (5 live) | PASS |
| health_screening_centre | Health Screening Centre | primary | B | 16 (11 live) | PASS |
| vaccination_centre | Vaccination Centre | primary | A | 16 (11 live) | PASS |
| fertility_clinic | Fertility Clinic | primary | B | 16 (11 live) | PASS |
| trauma_centre | Trauma Centre | secondary | A | 27 (18 live) | PASS |
| surgical_centre | Surgical Centre | secondary | B | 27 (18 live) | PASS |
| day_surgery_centre | Day Surgery Centre | secondary | A | 27 (18 live) | PASS |
| health_post | Health Post | community | B | 6 (6 live) | PASS |
| pharmacy | Pharmacy | pharmacy | A | 5 (5 live) | PASS |
| clinic | Clinic / Small Practice | primary | B | 16 (11 live) | PASS |
| rural_health_centre | Rural Health Centre | primary | A | 16 (11 live) | PASS |
| specialized_clinic | Specialized Clinic | support | B | 4 (4 live) | PASS |
| urban_health_centre | Urban Health Centre | primary | A | 16 (11 live) | PASS |
| mini_hospital | Mini Hospital / Zonal Facility | support | B | 4 (4 live) | PASS |
| hospital | Hospital | secondary | A | 27 (18 live) | PASS |
| district_hospital | District Hospital (First-Level) | secondary | B | 27 (18 live) | PASS |
| large_hospital | Large / Teaching Hospital | support | A | 4 (4 live) | PASS |
| provincial_hospital | Provincial / General Hospital (Second-Level) | secondary | B | 27 (18 live) | PASS |
| laboratory | Laboratory | diagnostics | A | 8 (8 live) | PASS |
| nursing_home | Nursing / Care Home | secondary | B | 27 (18 live) | PASS |
| tertiary_hospital | Tertiary / Teaching Hospital (Third-Level) | tertiary | A | 31 (21 live) | PASS |
| diagnostic_center | Diagnostic / Imaging Center | support | B | 4 (4 live) | PASS |
| maternity_hospital | Maternity Hospital | tertiary | A | 31 (21 live) | PASS |
| children_hospital | Children's Hospital | support | B | 4 (4 live) | PASS |
| mental_hospital | Mental Health Hospital | support | A | 4 (4 live) | PASS |
| cancer_hospital | Cancer / Oncology Hospital | support | B | 4 (4 live) | PASS |
| cardiac_hospital | Cardiac / Heart Hospital | support | A | 4 (4 live) | PASS |
| eye_hospital | Eye Hospital | tertiary | B | 31 (21 live) | PASS |
| orthopaedic_hospital | Orthopaedic Hospital | support | A | 4 (4 live) | PASS |
| dialysis_centre | Dialysis / Renal Centre | support | B | 4 (4 live) | PASS |
| specialty_clinic | Specialty Clinic | primary | A | 16 (11 live) | PASS |
| dental_clinic | Dental Clinic | primary | B | 16 (11 live) | PASS |
| eye_clinic | Eye Clinic | support | A | 4 (4 live) | PASS |
| physiotherapy_centre | Physiotherapy & Rehab Centre | support | B | 4 (4 live) | PASS |
| retail_pharmacy | Retail / Community Pharmacy | pharmacy | A | 5 (5 live) | PASS |
| hospital_pharmacy | Hospital Pharmacy Department | pharmacy | B | 5 (5 live) | PASS |
| wholesale_pharmacy | Wholesale Pharmacy / Distributor | pharmacy | A | 5 (5 live) | PASS |
| health_shop | Health Shop | primary | B | 16 (11 live) | PASS |
| imaging_centre | Imaging / Radiology Centre | diagnostics | A | 8 (8 live) | PASS |
| diagnostic_centre | Diagnostic Centre (Lab + Imaging) | diagnostics | B | 8 (8 live) | PASS |
| blood_bank | Blood Bank / Transfusion Service | diagnostics | A | 8 (8 live) | PASS |
| hospice | Hospice / Palliative Care | support | B | 4 (4 live) | PASS |
| home_care | Home-Based Care Service | support | A | 4 (4 live) | PASS |
| rehabilitation_centre | Rehabilitation Centre | support | B | 4 (4 live) | PASS |
