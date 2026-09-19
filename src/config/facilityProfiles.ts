/**
 * Facility profiles
 * ------------------------------------------------------------------
 * Different kinds of facilities run very different patient journeys.
 * A solo consultant never needs bed wards; a lab never needs theatre;
 * a pharmacy never admits anyone.
 *
 * This file is the single source of truth for:
 *   - which HMS modules are core / optional / not typical per facility type
 *   - which staff roles that facility usually employs
 *   - the patient journey that facility runs
 *
 * Nothing here hides functionality: every module stays visible in the
 * workspace. Modules that are not typical are simply de-emphasised and
 * explained, and the facility can still open and use them.
 */

export type ModuleRelevance = 'core' | 'optional' | 'atypical';

export type FacilityArchetype =
  | 'solo_practice'
  | 'clinic'
  | 'specialty_hospital'
  | 'general_hospital'
  | 'pharmacy'
  | 'diagnostics'
  | 'long_term_care';

/** HMS module keys — these match the tab values in HospitalManagement. */
export const HMS_MODULES = [
  'dashboard',
  'notifications',
  'emr',
  'opd',
  'ipd',
  'emergency',
  'ot',
  'lab',
  'radiology',
  'pharmacy',
  'beds',
  'billing',
  'tariffs',
  'insurance',
  'discharge',
  'staff',
  'mis',
] as const;

export type HmsModule = (typeof HMS_MODULES)[number];

export interface FacilityProfile {
  archetype: FacilityArchetype;
  label: string;
  /** Short plain-language description of how this facility sees patients. */
  summary: string;
  /** Ordered steps of the patient journey for this facility type. */
  journey: string[];
  /** Staff roles this facility typically employs, most common first. */
  staffRoles: string[];
  /** Relevance of each HMS module for this facility type. */
  modules: Record<HmsModule, ModuleRelevance>;
}

/** Helper to build the module map with a default and explicit overrides. */
const modules = (
  defaultRelevance: ModuleRelevance,
  overrides: Partial<Record<HmsModule, ModuleRelevance>>
): Record<HmsModule, ModuleRelevance> => {
  const out = {} as Record<HmsModule, ModuleRelevance>;
  for (const m of HMS_MODULES) out[m] = overrides[m] ?? defaultRelevance;
  // These are universal — every facility needs them.
  out.dashboard = 'core';
  out.notifications = 'core';
  out.billing = out.billing === 'atypical' ? 'optional' : out.billing;
  return out;
};

export const FACILITY_PROFILES: Record<FacilityArchetype, FacilityProfile> = {
  solo_practice: {
    archetype: 'solo_practice',
    label: 'Solo / Independent Consultant',
    summary:
      'One practitioner seeing booked and walk-in patients, writing notes and prescriptions, and being paid per consultation.',
    journey: [
      'Patient books online or walks in',
      'Reception or the practitioner checks them in to the day list',
      'Consultation is recorded in the patient record',
      'Prescription or referral is issued',
      'Payment is collected and the receipt is issued',
    ],
    staffRoles: ['doctor', 'receptionist', 'nurse', 'billing_clerk'],
    modules: modules('atypical', {
      emr: 'core',
      opd: 'core',
      billing: 'core',
      staff: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      lab: 'optional',
      radiology: 'optional',
      pharmacy: 'optional',
      mis: 'optional',
    }),
  },

  clinic: {
    archetype: 'clinic',
    label: 'Clinic / Small Practice',
    summary:
      'A small team running an outpatient day list, with a treatment room, some tests and dispensing, but no overnight stays.',
    journey: [
      'Patient books or arrives and is registered',
      'Triage or vitals are taken',
      'Consultation and treatment are recorded',
      'Tests or imaging are ordered where needed',
      'Medicines are dispensed or prescribed',
      'Payment and follow-up appointment',
    ],
    staffRoles: [
      'doctor',
      'nurse',
      'receptionist',
      'lab_technician',
      'pharmacist',
      'billing_clerk',
      'admin',
    ],
    modules: modules('atypical', {
      emr: 'core',
      opd: 'core',
      billing: 'core',
      staff: 'core',
      lab: 'optional',
      radiology: 'optional',
      pharmacy: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      emergency: 'optional',
      mis: 'optional',
    }),
  },

  specialty_hospital: {
    archetype: 'specialty_hospital',
    label: 'Specialised Hospital',
    summary:
      'A focused facility (eye, dental, maternity, orthopaedic and similar) running clinics, procedures and short stays in one specialty.',
    journey: [
      'Referral or direct booking into the specialty clinic',
      'Registration and pre-assessment',
      'Consultation and procedure planning',
      'Day case or short admission with theatre where needed',
      'Recovery, discharge notes and follow-up',
      'Billing, insurance claim and payment',
    ],
    staffRoles: [
      'doctor',
      'nurse',
      'receptionist',
      'pharmacist',
      'lab_technician',
      'radiologist',
      'billing_clerk',
      'admin',
    ],
    modules: modules('optional', {
      emr: 'core',
      opd: 'core',
      ot: 'core',
      billing: 'core',
      staff: 'core',
      discharge: 'core',
      ipd: 'optional',
      beds: 'optional',
      emergency: 'optional',
    }),
  },

  general_hospital: {
    archetype: 'general_hospital',
    label: 'General / Referral Hospital',
    summary:
      'A full hospital: casualty, outpatients, wards, theatre, its own lab, imaging and pharmacy, with departmental billing.',
    journey: [
      'Patient arrives at casualty, outpatients or by referral',
      'Triage sets the urgency',
      'Consultation, tests and imaging',
      'Admission to a ward and bed if required',
      'Ward rounds, medication rounds and theatre',
      'Discharge summary, billing and follow-up',
    ],
    staffRoles: [
      'doctor',
      'nurse',
      'receptionist',
      'lab_technician',
      'radiologist',
      'pharmacist',
      'billing_clerk',
      'admin',
      'housekeeping',
      'security',
    ],
    modules: modules('core', {}),
  },

  pharmacy: {
    archetype: 'pharmacy',
    label: 'Pharmacy / Dispensary',
    summary:
      'Receives prescriptions and online orders, checks stock, dispenses, and delivers or hands over at the counter.',
    journey: [
      'Prescription or online order arrives',
      'Pharmacist reviews it and checks interactions',
      'Stock is picked and dispensed',
      'Payment is taken at the counter or online',
      'Handover or delivery, and counselling notes are saved',
    ],
    staffRoles: ['pharmacist', 'billing_clerk', 'admin', 'other'],
    modules: modules('atypical', {
      pharmacy: 'core',
      billing: 'core',
      staff: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      mis: 'optional',
      emr: 'optional',
    }),
  },

  diagnostics: {
    archetype: 'diagnostics',
    label: 'Laboratory / Diagnostic & Imaging Centre',
    summary:
      'Works from test requests: collects samples or scans patients, runs the work, verifies results and releases them.',
    journey: [
      'Test or scan request arrives from a doctor, or the patient walks in',
      'Registration and payment or insurance check',
      'Sample collection or imaging appointment',
      'Analysis or scanning is performed',
      'Result is verified by the pathologist or radiologist',
      'Report is released to the patient and the referring doctor',
    ],
    staffRoles: [
      'lab_technician',
      'radiologist',
      'doctor',
      'receptionist',
      'billing_clerk',
      'admin',
    ],
    modules: modules('atypical', {
      lab: 'core',
      radiology: 'core',
      billing: 'core',
      emr: 'optional',
      opd: 'optional',
      staff: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      mis: 'optional',
    }),
  },

  long_term_care: {
    archetype: 'long_term_care',
    label: 'Nursing Home / Care Home',
    summary:
      'Residents stay long term: beds, daily care rounds, medication rounds and periodic reviews rather than one-off visits.',
    journey: [
      'Admission assessment and care plan',
      'Bed and room allocation',
      'Daily nursing and medication rounds',
      'Doctor reviews and family updates',
      'Transfer, discharge or ongoing monthly billing',
    ],
    staffRoles: ['nurse', 'doctor', 'admin', 'housekeeping', 'pharmacist', 'billing_clerk'],
    modules: modules('atypical', {
      emr: 'core',
      ipd: 'core',
      beds: 'core',
      billing: 'core',
      staff: 'core',
      pharmacy: 'optional',
      discharge: 'optional',
      insurance: 'optional',
      mis: 'optional',
      lab: 'optional',
    }),
  },
};

/** Maps a stored institution/provider type onto a facility archetype.
 * Covers the full MOH Zambia pyramid (health post → L1/L2/L3 hospitals),
 * private practice types, ZAMRA pharmacy premises and long-term care. */
const TYPE_TO_ARCHETYPE: Record<string, FacilityArchetype> = {
  // Solo practitioners
  doctor: 'solo_practice',
  dentist: 'solo_practice',
  optician: 'solo_practice',
  optometrist: 'solo_practice',
  individual: 'solo_practice',
  solo_practice: 'solo_practice',
  private_practice: 'solo_practice',
  consulting_room: 'solo_practice',

  // Primary care — health posts & centres (MOH base of the pyramid)
  health_post: 'clinic',
  rural_health_centre: 'clinic',
  rhc: 'clinic',
  urban_health_centre: 'clinic',
  uhc: 'clinic',
  health_center: 'clinic',
  health_centre: 'clinic',
  community_health_unit: 'clinic',
  mobile_clinic: 'clinic',
  outreach_post: 'clinic',

  // Clinics (private & specialised outpatient)
  clinic: 'clinic',
  dental_clinic: 'clinic',
  eye_clinic: 'clinic',
  skin_clinic: 'clinic',
  dermatology_clinic: 'clinic',
  physiotherapy: 'clinic',
  physiotherapy_centre: 'clinic',
  pediatric_center: 'clinic',
  paediatric_centre: 'clinic',
  ent_clinic: 'clinic',
  mental_health_clinic: 'clinic',

  // Mini-hospitals & first-level (district) hospitals
  mini_hospital: 'general_hospital',
  zonal_hospital: 'general_hospital',
  district_hospital: 'general_hospital',
  first_level_hospital: 'general_hospital',
  level_1_hospital: 'general_hospital',

  // Second-level (provincial / general) hospitals
  provincial_hospital: 'general_hospital',
  general_hospital: 'general_hospital',
  second_level_hospital: 'general_hospital',
  level_2_hospital: 'general_hospital',

  // Third-level (tertiary / teaching / referral) hospitals
  tertiary_hospital: 'general_hospital',
  third_level_hospital: 'general_hospital',
  level_3_hospital: 'general_hospital',
  teaching_hospital: 'general_hospital',
  referral_hospital: 'general_hospital',
  central_hospital: 'general_hospital',
  hospital: 'general_hospital',

  // Specialised hospitals (4th level / focused)
  specialty_clinic: 'specialty_hospital',
  specialty_hospital: 'specialty_hospital',
  specialized_hospital: 'specialty_hospital',
  maternity_hospital: 'specialty_hospital',
  maternity: 'specialty_hospital',
  eye_hospital: 'specialty_hospital',
  dental_hospital: 'specialty_hospital',
  cardiac_hospital: 'specialty_hospital',
  heart_hospital: 'specialty_hospital',
  cancer_hospital: 'specialty_hospital',
  oncology_centre: 'specialty_hospital',
  mental_hospital: 'specialty_hospital',
  psychiatric_hospital: 'specialty_hospital',
  children_hospital: 'specialty_hospital',
  paediatric_hospital: 'specialty_hospital',
  orthopaedic_hospital: 'specialty_hospital',
  dialysis_centre: 'specialty_hospital',
  dialysis_center: 'specialty_hospital',
  surgical_centre: 'specialty_hospital',
  day_surgery: 'specialty_hospital',

  // Pharmacies (ZAMRA premises)
  pharmacy: 'pharmacy',
  retail_pharmacy: 'pharmacy',
  community_pharmacy: 'pharmacy',
  hospital_pharmacy: 'pharmacy',
  dispensary: 'pharmacy',
  drug_store: 'pharmacy',
  wholesale_pharmacy: 'pharmacy',
  health_shop: 'pharmacy',

  // Diagnostics & imaging
  laboratory: 'diagnostics',
  lab: 'diagnostics',
  medical_laboratory: 'diagnostics',
  diagnostic_center: 'diagnostics',
  diagnostic_centre: 'diagnostics',
  radiology_center: 'diagnostics',
  radiology_centre: 'diagnostics',
  imaging_center: 'diagnostics',
  imaging_centre: 'diagnostics',
  blood_bank: 'diagnostics',
  pathology_lab: 'diagnostics',

  // Long term & community-based care
  nursing_home: 'long_term_care',
  care_home: 'long_term_care',
  hospice: 'long_term_care',
  rehabilitation_centre: 'long_term_care',
  home_care: 'long_term_care',
  home_based_care: 'long_term_care',
  domiciliary_care: 'long_term_care',
};

export function getFacilityArchetype(type?: string | null): FacilityArchetype {
  if (!type) return 'clinic';
  const key = String(type).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return TYPE_TO_ARCHETYPE[key] ?? 'clinic';
}

export function getFacilityProfile(type?: string | null): FacilityProfile {
  return FACILITY_PROFILES[getFacilityArchetype(type)];
}

export function getModuleRelevance(type: string | null | undefined, module: HmsModule): ModuleRelevance {
  return getFacilityProfile(type).modules[module] ?? 'optional';
}

/** Human label used in the "not typical" explanation. */
export function facilityTypeLabel(type?: string | null): string {
  return getFacilityProfile(type).label;
}

// ─── Institution type taxonomy (MOH Zambia + private + ZAMRA) ───────────
// Used as the signup fallback AND mirrored by the DB seed migration
// (supabase/migrations/20260918_health_workforce_roles.sql).
// `kind` lets signup flows show only relevant types (care / pharmacy /
// diagnostic / support) and map each type to the correct account role.
export interface InstitutionTypeOption {
  code: string;
  name: string;
  description: string;
  kind: 'care' | 'pharmacy' | 'diagnostic' | 'support';
  mohLevel?: string;
}

export const INSTITUTION_TYPE_OPTIONS: InstitutionTypeOption[] = [
  // ── Public pyramid (MOH Zambia) ──
  { code: 'health_post', name: 'Health Post', description: 'Community-level primary care post', kind: 'care', mohLevel: 'Community' },
  { code: 'rural_health_centre', name: 'Rural Health Centre', description: 'Primary care for rural catchment populations', kind: 'care', mohLevel: 'Primary' },
  { code: 'urban_health_centre', name: 'Urban Health Centre', description: 'Primary care for urban communities', kind: 'care', mohLevel: 'Primary' },
  { code: 'mini_hospital', name: 'Mini Hospital / Zonal Facility', description: 'Small hospital with limited admissions', kind: 'care', mohLevel: 'Primary' },
  { code: 'district_hospital', name: 'District Hospital (First-Level)', description: 'First referral level — district services', kind: 'care', mohLevel: 'Level 1' },
  { code: 'provincial_hospital', name: 'Provincial / General Hospital (Second-Level)', description: 'Second referral level — provincial services', kind: 'care', mohLevel: 'Level 2' },
  { code: 'tertiary_hospital', name: 'Tertiary / Teaching Hospital (Third-Level)', description: 'Highly specialised national referral care', kind: 'care', mohLevel: 'Level 3' },
  // ── Specialised hospitals ──
  { code: 'maternity_hospital', name: 'Maternity Hospital', description: 'Obstetric & newborn specialised care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'children_hospital', name: "Children's Hospital", description: 'Specialised paediatric care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'mental_hospital', name: 'Mental Health Hospital', description: 'Psychiatric specialised care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'cancer_hospital', name: 'Cancer / Oncology Hospital', description: 'Oncology specialised care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'cardiac_hospital', name: 'Cardiac / Heart Hospital', description: 'Cardiology & cardiothoracic care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'eye_hospital', name: 'Eye Hospital', description: 'Ophthalmology specialised care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'orthopaedic_hospital', name: 'Orthopaedic Hospital', description: 'Bone & joint specialised care', kind: 'care', mohLevel: 'Specialised' },
  { code: 'dialysis_centre', name: 'Dialysis / Renal Centre', description: 'Renal replacement therapy', kind: 'care', mohLevel: 'Specialised' },
  // ── Private practice ──
  { code: 'clinic', name: 'Clinic / Small Practice', description: 'Outpatient day practice, no overnight stays', kind: 'care' },
  { code: 'specialty_clinic', name: 'Specialty Clinic', description: 'Single-specialty outpatient clinic', kind: 'care' },
  { code: 'dental_clinic', name: 'Dental Clinic', description: 'Oral & dental care clinic', kind: 'care' },
  { code: 'eye_clinic', name: 'Eye Clinic', description: 'Optometry & eye care clinic', kind: 'care' },
  { code: 'physiotherapy_centre', name: 'Physiotherapy & Rehab Centre', description: 'Rehabilitation services', kind: 'care' },
  { code: 'hospital', name: 'Private Hospital', description: 'Full private hospital services', kind: 'care' },
  // ── Pharmacy (ZAMRA) ──
  { code: 'retail_pharmacy', name: 'Retail / Community Pharmacy', description: 'Dispense to the public (ZAMRA retail licence)', kind: 'pharmacy' },
  { code: 'hospital_pharmacy', name: 'Hospital Pharmacy Department', description: 'In-house hospital dispensing unit', kind: 'pharmacy' },
  { code: 'wholesale_pharmacy', name: 'Wholesale Pharmacy / Distributor', description: 'B2B medicine distribution (ZAMRA wholesale licence)', kind: 'pharmacy' },
  { code: 'health_shop', name: 'Health Shop', description: 'OTC, supplements & wellness products', kind: 'pharmacy' },
  // ── Diagnostics ──
  { code: 'laboratory', name: 'Medical Laboratory', description: 'Sample testing & pathology', kind: 'diagnostic' },
  { code: 'imaging_centre', name: 'Imaging / Radiology Centre', description: 'X-ray, ultrasound, CT & MRI', kind: 'diagnostic' },
  { code: 'diagnostic_centre', name: 'Diagnostic Centre (Lab + Imaging)', description: 'Combined laboratory & imaging services', kind: 'diagnostic' },
  { code: 'blood_bank', name: 'Blood Bank / Transfusion Service', description: 'Blood collection & transfusion', kind: 'diagnostic' },
  // ── Long-term & community care ──
  { code: 'nursing_home', name: 'Nursing / Care Home', description: 'Long-term residential nursing care', kind: 'support' },
  { code: 'hospice', name: 'Hospice / Palliative Care', description: 'End-of-life & palliative care', kind: 'support' },
  { code: 'home_care', name: 'Home-Based Care Service', description: 'Domiciliary nursing & clinical visits', kind: 'support' },
  { code: 'rehabilitation_centre', name: 'Rehabilitation Centre', description: 'Long-stay physical & occupational rehab', kind: 'support' },
];

/** Map an institution type code to the account role its admin signs up with. */
export function institutionTypeToRole(typeCode?: string | null): string {
  const code = (typeCode || '').toLowerCase();
  if (code.includes('wholesale')) return 'wholesale_pharmacy';
  if (code.includes('pharm') || code.includes('drug_store') || code.includes('dispensary') || code === 'health_shop') return 'pharmacy';
  if (code.includes('lab') || code.includes('blood_bank')) return 'lab';
  if (code.includes('imaging') || code.includes('radiology') || code.includes('diagnostic')) return 'lab';
  return 'institution_admin';
}

// ─── Default departments seeded at signup ("everything done for them") ──
// Each archetype gets the departments its HMS modules expect, so queues,
// beds, theatre lists and stock rooms work from day one with zero setup.
export interface DefaultDepartment {
  name: string;
  code: string;
  description?: string;
}

export const DEFAULT_DEPARTMENTS: Record<FacilityArchetype, DefaultDepartment[]> = {
  solo_practice: [
    { name: 'Consultation', code: 'CONS', description: 'Booked & walk-in consultations' },
    { name: 'Dispensary', code: 'DISP', description: 'In-room dispensing' },
  ],
  clinic: [
    { name: 'Outpatient (OPD)', code: 'OPD', description: 'General outpatient consultations' },
    { name: 'Triage & Vitals', code: 'TRIAGE', description: 'Nurse-led triage station' },
    { name: 'Laboratory', code: 'LAB', description: 'Point-of-care testing' },
    { name: 'Dispensary', code: 'DISP', description: 'Medicine dispensing' },
    { name: 'Accounts', code: 'ACCT', description: 'Billing & receipts' },
  ],
  specialty_hospital: [
    { name: 'Specialist Clinic', code: 'SPEC', description: 'Specialty outpatient clinic' },
    { name: 'Day Ward', code: 'DAY', description: 'Day-case admissions' },
    { name: 'Theatre', code: 'OT', description: 'Procedure / operating theatre' },
    { name: 'Laboratory', code: 'LAB', description: 'In-house laboratory' },
    { name: 'Imaging', code: 'IMG', description: 'X-ray & ultrasound' },
    { name: 'Pharmacy', code: 'PHARM', description: 'In-house pharmacy' },
    { name: 'Accounts', code: 'ACCT', description: 'Billing & insurance' },
  ],
  general_hospital: [
    { name: 'Casualty / Emergency', code: 'A&E', description: '24h emergency receiving' },
    { name: 'Outpatient (OPD)', code: 'OPD', description: 'General & specialist clinics' },
    { name: 'Male Ward', code: 'MW', description: 'Male admissions' },
    { name: 'Female Ward', code: 'FW', description: 'Female admissions' },
    { name: 'Paediatric Ward', code: 'PAED', description: "Children's admissions" },
    { name: 'Maternity / Labour', code: 'MAT', description: 'Labour, delivery & postnatal' },
    { name: 'Theatre', code: 'OT', description: 'Operating theatres' },
    { name: 'Laboratory', code: 'LAB', description: 'Central laboratory' },
    { name: 'Imaging', code: 'IMG', description: 'Radiology & imaging' },
    { name: 'Pharmacy', code: 'PHARM', description: 'Main pharmacy & stores' },
    { name: 'Accounts', code: 'ACCT', description: 'Billing, NHIMA & insurance' },
  ],
  pharmacy: [
    { name: 'Prescription Counter', code: 'RX', description: 'Prescription receiving & review' },
    { name: 'OTC & Retail', code: 'OTC', description: 'Over-the-counter sales floor' },
    { name: 'Stores', code: 'STORE', description: 'Stock room & cold chain' },
    { name: 'Accounts', code: 'ACCT', description: 'POS billing & receipts' },
  ],
  diagnostics: [
    { name: 'Reception & Sample Collection', code: 'RECEP', description: 'Registration & phlebotomy' },
    { name: 'Haematology', code: 'HAEM', description: 'Blood testing bench' },
    { name: 'Microbiology', code: 'MICRO', description: 'Culture & sensitivity bench' },
    { name: 'Imaging', code: 'IMG', description: 'X-ray & ultrasound suites' },
    { name: 'Results & Reporting', code: 'REP', description: 'Verification & release desk' },
    { name: 'Accounts', code: 'ACCT', description: 'Billing & receipts' },
  ],
  long_term_care: [
    { name: 'Residential Wing A', code: 'WING-A', description: 'Long-stay resident beds' },
    { name: 'Residential Wing B', code: 'WING-B', description: 'Long-stay resident beds' },
    { name: 'Nursing Station', code: 'NURSE', description: 'Care rounds & medication rounds' },
    { name: 'Therapy Room', code: 'THER', description: 'Physio & occupational therapy' },
    { name: 'Accounts', code: 'ACCT', description: 'Monthly billing & receipts' },
  ],
};
