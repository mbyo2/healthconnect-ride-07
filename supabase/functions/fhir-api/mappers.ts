/**
 * FHIR R4 mappers — Doc' O Clock internal tables <-> HL7 FHIR R4 resources.
 * Pure functions (no DB, no Deno APIs) so they can be unit-tested and inlined.
 *
 * Internal -> FHIR direction is authoritative. The reverse direction is used
 * only for the small set of resources that accept POST (create).
 */

export const FHIR_VERSION = "4.0.1";
export const FHIR_BASE = "https://doc0clock.online/fhir";

const nowIso = () => new Date().toISOString();

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeGender(g: unknown): "male" | "female" | "other" | "unknown" {
  const v = String(g ?? "").toLowerCase();
  if (v === "male" || v === "m") return "male";
  if (v === "female" || v === "f") return "female";
  if (v === "other" || v === "o") return "other";
  return "unknown";
}

function metaOf(row: { updated_at?: string | null; created_at?: string | null }) {
  return { lastUpdated: row.updated_at || row.created_at || nowIso() };
}

// ── Patient ← profiles ─────────────────────────────────────────────────────

export function mapPatient(p: {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  const telecom: Array<{ system: string; value: string; use: string }> = [];
  if (p.email) telecom.push({ system: "email", value: p.email, use: "home" });
  if (p.phone) telecom.push({ system: "phone", value: p.phone, use: "mobile" });

  const resource: Record<string, unknown> = {
    resourceType: "Patient",
    id: p.id,
    meta: metaOf(p),
    identifier: [
      { system: `${FHIR_BASE}/identifier/patient`, value: p.id, use: "official" },
    ],
    active: true,
    name: [
      {
        use: "official",
        family: p.last_name || "",
        given: p.first_name ? [p.first_name] : [],
      },
    ],
    gender: normalizeGender(p.gender),
  };
  if (telecom.length) resource.telecom = telecom;
  if (p.date_of_birth) resource.birthDate = p.date_of_birth;
  if (p.address) resource.address = [{ use: "home", text: p.address }];
  return resource;
}

// ── Observation ← vital_signs ──────────────────────────────────────────────
// One internal vital_signs row can carry several vitals, so each vital becomes
// its own Observation with id "<rowId>-<vitalKey>" (read round-trips by split).

export const VITAL_LOINC: Record<
  string,
  { code: string; display: string; unit: string; ucum: string }
> = {
  heart_rate: {
    code: "8867-4",
    display: "Heart rate",
    unit: "beats/min",
    ucum: "/min",
  },
  temperature: {
    code: "8310-5",
    display: "Body temperature",
    unit: "Cel",
    ucum: "Cel",
  },
  oxygen_saturation: {
    code: "2708-6",
    display: "Oxygen saturation in Arterial blood",
    unit: "%",
    ucum: "%",
  },
};

const OBS_CATEGORY = [
  {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/observation-category",
        code: "vital-signs",
        display: "Vital Signs",
      },
    ],
  },
];

function singleVitalObservation(
  row: { id: string; user_id: string; recorded_at?: string | null; created_at?: string | null; updated_at?: string | null },
  vitalKey: string,
  value: number
) {
  const loinc = VITAL_LOINC[vitalKey];
  return {
    resourceType: "Observation",
    id: `${row.id}-${vitalKey}`,
    meta: metaOf(row),
    status: "final",
    category: OBS_CATEGORY,
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: loinc.code,
          display: loinc.display,
        },
      ],
      text: loinc.display,
    },
    subject: { reference: `Patient/${row.user_id}` },
    effectiveDateTime: row.recorded_at || row.created_at || nowIso(),
    valueQuantity: {
      value,
      unit: loinc.unit,
      system: "http://unitsofmeasure.org",
      code: loinc.ucum,
    },
  };
}

function bloodPressureObservation(row: {
  id: string;
  user_id: string;
  recorded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  blood_pressure: unknown;
}) {
  const bp = row.blood_pressure as Record<string, unknown> | null;
  const sys = bp ? Number((bp as Record<string, unknown>).systolic ?? (bp as Record<string, unknown>).sys) : NaN;
  const dia = bp ? Number((bp as Record<string, unknown>).diastolic ?? (bp as Record<string, unknown>).dia) : NaN;

  // Numeric systolic/diastolic -> proper BP panel with components (LOINC 85354-9)
  if (Number.isFinite(sys) && Number.isFinite(dia)) {
    const components = [
      {
        code: {
          coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }],
          text: "Systolic blood pressure",
        },
        valueQuantity: { value: sys, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
      },
      {
        code: {
          coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }],
          text: "Diastolic blood pressure",
        },
        valueQuantity: { value: dia, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
      },
    ];
    return {
      resourceType: "Observation",
      id: `${row.id}-blood_pressure`,
      meta: metaOf(row),
      status: "final",
      category: OBS_CATEGORY,
      code: {
        coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }],
        text: "Blood pressure",
      },
      subject: { reference: `Patient/${row.user_id}` },
      effectiveDateTime: row.recorded_at || row.created_at || nowIso(),
      component: components,
    };
  }

  // Non-numeric payload -> valueString observation so nothing is lost
  return {
    resourceType: "Observation",
    id: `${row.id}-blood_pressure`,
    meta: metaOf(row),
    status: "final",
    category: OBS_CATEGORY,
    code: {
      coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }],
      text: "Blood pressure",
    },
    subject: { reference: `Patient/${row.user_id}` },
    effectiveDateTime: row.recorded_at || row.created_at || nowIso(),
    valueString: typeof row.blood_pressure === "string" ? row.blood_pressure : JSON.stringify(row.blood_pressure),
  };
}

export function mapVitalSignsRow(row: {
  id: string;
  user_id: string;
  heart_rate?: number | null;
  blood_pressure?: unknown;
  temperature?: number | string | null;
  oxygen_saturation?: number | string | null;
  recorded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  const out: unknown[] = [];
  if (row.heart_rate != null && Number.isFinite(Number(row.heart_rate))) {
    out.push(singleVitalObservation(row, "heart_rate", Number(row.heart_rate)));
  }
  if (row.temperature != null && Number.isFinite(Number(row.temperature))) {
    out.push(singleVitalObservation(row, "temperature", Number(row.temperature)));
  }
  if (row.oxygen_saturation != null && Number.isFinite(Number(row.oxygen_saturation))) {
    out.push(singleVitalObservation(row, "oxygen_saturation", Number(row.oxygen_saturation)));
  }
  if (row.blood_pressure != null && row.blood_pressure !== "") {
    out.push(bloodPressureObservation(row as Parameters<typeof bloodPressureObservation>[0]));
  }
  return out;
}

/** Reverse: FHIR Observation (vital signs) -> vital_signs insert payload. */
export function observationToVitals(obs: Record<string, unknown>): {
  heart_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  blood_pressure?: Record<string, number>;
} {
  const coding = ((obs.code as Record<string, unknown>)?.coding as Array<Record<string, string>>) || [];
  const loinc = coding.find((c) => c.system === "http://loinc.org")?.code;
  const out: Record<string, unknown> = {};
  const qty = (obs.valueQuantity as Record<string, unknown>) || {};
  const value = Number(qty.value);

  if (loinc === "8867-4" && Number.isFinite(value)) out.heart_rate = value;
  else if (loinc === "8310-5" && Number.isFinite(value)) out.temperature = value;
  else if (loinc === "2708-6" && Number.isFinite(value)) out.oxygen_saturation = value;
  else if (loinc === "85354-9") {
    const comps = (obs.component as Array<Record<string, unknown>>) || [];
    const bp: Record<string, number> = {};
    for (const comp of comps) {
      const cc = ((comp.code as Record<string, unknown>)?.coding as Array<Record<string, string>>) || [];
      const code = cc.find((c) => c.system === "http://loinc.org")?.code;
      const v = Number((comp.valueQuantity as Record<string, unknown>)?.value);
      if (code === "8480-6" && Number.isFinite(v)) bp.systolic = v;
      if (code === "8462-4" && Number.isFinite(v)) bp.diastolic = v;
    }
    if (bp.systolic != null || bp.diastolic != null) out.blood_pressure = bp;
  } else {
    throw new Error(
      `Unsupported observation code '${loinc ?? "missing"}'. Supported LOINC: 8867-4, 8310-5, 2708-6, 85354-9.`
    );
  }
  if (Object.keys(out).length === 0) throw new Error("Observation carries no usable vital-sign value.");
  return out as { heart_rate?: number; temperature?: number; oxygen_saturation?: number; blood_pressure?: Record<string, number> };
}

// ── Observation ← lab_results (id namespace "lab-<id>") ─────────────────────

export function mapLabResultObservation(r: {
  id: string;
  patient_id: string;
  test_name?: string | null;
  result_value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  test_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
}) {
  const resource: Record<string, unknown> = {
    resourceType: "Observation",
    id: `lab-${r.id}`,
    meta: { lastUpdated: r.created_at || nowIso() },
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: { text: r.test_name || "Laboratory result" },
    subject: { reference: `Patient/${r.patient_id}` },
    effectiveDateTime: r.test_date || r.created_at || nowIso(),
  };
  if (r.result_value != null) {
    const n = Number(r.result_value);
    resource.valueQuantity = Number.isFinite(n) && r.result_value.trim() !== ""
      ? { value: n, unit: r.unit || "" }
      : undefined;
    if (resource.valueQuantity === undefined) resource.valueString = r.result_value;
  }
  if (r.reference_range) {
    resource.referenceRange = [{ text: r.reference_range }];
  }
  if (r.notes) resource.note = [{ text: r.notes }];
  return resource;
}

// ── Condition ← comprehensive_medical_records ──────────────────────────────

export function mapCondition(r: {
  id: string;
  patient_id: string;
  title: string;
  description?: string | null;
  visit_date?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  const clinicalCode = r.status === "resolved" ? "resolved" : r.status === "inactive" ? "inactive" : "active";
  const resource: Record<string, unknown> = {
    resourceType: "Condition",
    id: r.id,
    meta: metaOf(r),
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: clinicalCode,
          display: clinicalCode,
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
          display: "Confirmed",
        },
      ],
    },
    code: { text: r.title },
    subject: { reference: `Patient/${r.patient_id}` },
  };
  if (r.visit_date) resource.recordedDate = r.visit_date;
  if (r.description) resource.note = [{ text: r.description }];
  return resource;
}

// ── MedicationRequest ← comprehensive_prescriptions ────────────────────────

const RX_STATUS_MAP: Record<string, string> = {
  pending: "active",
  filled: "completed",
  partially_filled: "active",
  cancelled: "cancelled",
  expired: "stopped",
};

export function mapMedicationRequest(rx: {
  id: string;
  patient_id: string;
  provider_id: string;
  medication_name: string;
  generic_name?: string | null;
  dosage: string;
  instructions: string;
  quantity: number;
  refills_remaining?: number | null;
  status?: string | null;
  prescribed_date?: string | null;
  expiry_date?: string | null;
  prescription_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  const resource: Record<string, unknown> = {
    resourceType: "MedicationRequest",
    id: rx.id,
    meta: metaOf(rx),
    identifier: rx.prescription_number
      ? [{ system: `${FHIR_BASE}/identifier/prescription`, value: rx.prescription_number, use: "official" }]
      : undefined,
    status: RX_STATUS_MAP[rx.status || ""] || "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: rx.generic_name
        ? [{ system: `${FHIR_BASE}/codes/medication`, code: rx.generic_name, display: rx.medication_name }]
        : undefined,
      text: rx.medication_name,
    },
    subject: { reference: `Patient/${rx.patient_id}` },
    requester: { reference: `Practitioner/${rx.provider_id}` },
    dosageInstruction: [{ text: `${rx.dosage} — ${rx.instructions}` }],
    dispenseRequest: {
      quantity: { value: rx.quantity },
      numberOfRepeatsAllowed: rx.refills_remaining ?? 0,
    },
  };
  if (rx.prescribed_date) resource.authoredOn = rx.prescribed_date;
  if (rx.expiry_date) resource.dispenseRequest = { ...(resource.dispenseRequest as object), validityPeriod: { end: rx.expiry_date } };
  return resource;
}

// ── Appointment ← appointments ─────────────────────────────────────────────

const APPT_STATUS_MAP: Record<string, string> = {
  scheduled: "booked",
  confirmed: "booked",
  in_progress: "checked-in",
  completed: "fulfilled",
  cancelled: "cancelled",
  noshow: "noshow",
};

export function mapAppointment(a: {
  id: string;
  patient_id: string;
  provider_id?: string | null;
  date: string;
  time?: string | null;
  status?: string | null;
  type?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  // Africa/Lusaka (CAT, UTC+2, no DST)
  const start = a.time ? `${a.date}T${a.time}+02:00` : `${a.date}T00:00:00+02:00`;
  const resource: Record<string, unknown> = {
    resourceType: "Appointment",
    id: a.id,
    meta: metaOf(a),
    identifier: [{ system: `${FHIR_BASE}/identifier/appointment`, value: a.id, use: "official" }],
    status: APPT_STATUS_MAP[a.status || ""] || "booked",
    serviceType: a.type ? [{ text: a.type }] : undefined,
    start,
    participant: [
      { actor: { reference: `Patient/${a.patient_id}` }, status: "accepted" },
      ...(a.provider_id ? [{ actor: { reference: `Practitioner/${a.provider_id}` }, status: "accepted" }] : []),
    ],
  };
  if (a.notes) resource.description = a.notes;
  return resource;
}

// ── Encounter ← hospital_admissions ────────────────────────────────────────

const ADMISSION_STATUS_MAP: Record<string, string> = {
  admitted: "in-progress",
  discharged: "finished",
  transferred: "in-progress",
};

export function mapEncounter(ad: {
  id: string;
  patient_id: string;
  hospital_id?: string | null;
  department_id?: string | null;
  admission_date: string;
  discharge_date?: string | null;
  diagnosis?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  const resource: Record<string, unknown> = {
    resourceType: "Encounter",
    id: ad.id,
    meta: metaOf(ad),
    identifier: [{ system: `${FHIR_BASE}/identifier/encounter`, value: ad.id, use: "official" }],
    status: ADMISSION_STATUS_MAP[ad.status || ""] || "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "IMP",
      display: "inpatient encounter",
    },
    subject: { reference: `Patient/${ad.patient_id}` },
    period: {
      start: ad.admission_date,
      ...(ad.discharge_date ? { end: ad.discharge_date } : {}),
    },
  };
  if (ad.diagnosis) resource.diagnosis = [{ condition: { text: ad.diagnosis }, use: { text: "Admission diagnosis" } }];
  if (ad.hospital_id) resource.serviceProvider = { reference: `Organization/${ad.hospital_id}` };
  return resource;
}

// ── DiagnosticReport ← lab_requests (+ lab_tests catalog join) ─────────────

const LABREQ_STATUS_MAP: Record<string, string> = {
  pending: "registered",
  in_progress: "partial",
  completed: "final",
  cancelled: "cancelled",
};

export function mapDiagnosticReport(
  req: {
    id: string;
    patient_id: string;
    provider_id?: string | null;
    status?: string | null;
    priority?: string | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    test?: { name?: string; code?: string; category?: string } | null;
  },
  resultIds: string[]
) {
  const test = req.test || {};
  const resource: Record<string, unknown> = {
    resourceType: "DiagnosticReport",
    id: req.id,
    meta: metaOf(req),
    identifier: [{ system: `${FHIR_BASE}/identifier/diagnostic-report`, value: req.id, use: "official" }],
    status: LABREQ_STATUS_MAP[req.status || ""] || "registered",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0074",
            code: "LAB",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: test.code
        ? [{ system: `${FHIR_BASE}/codes/lab-test`, code: test.code, display: test.name || test.code }]
        : undefined,
      text: test.name || "Laboratory report",
    },
    subject: { reference: `Patient/${req.patient_id}` },
    effectiveDateTime: req.created_at || nowIso(),
    issued: req.updated_at || req.created_at || nowIso(),
  };
  if (req.provider_id) resource.performer = [{ actor: { reference: `Practitioner/${req.provider_id}` } }];
  if (resultIds.length) resource.result = resultIds.map((rid) => ({ reference: `Observation/lab-${rid}` }));
  if (req.notes) resource.conclusion = req.notes;
  return resource;
}

// ── Immunization ← immunizations ───────────────────────────────────────────

export function mapImmunization(im: {
  id: string;
  patient_id: string;
  vaccine_name: string;
  dose_number?: number | null;
  scheduled_date?: string | null;
  administered_date?: string | null;
  administered_by?: string | null;
  batch_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  const completed = !!im.administered_date;
  const resource: Record<string, unknown> = {
    resourceType: "Immunization",
    id: im.id,
    meta: metaOf(im),
    identifier: [{ system: `${FHIR_BASE}/identifier/immunization`, value: im.id, use: "official" }],
    status: completed ? "completed" : "not-done",
    vaccineCode: { text: im.vaccine_name },
    patient: { reference: `Patient/${im.patient_id}` },
    protocolApplied: [
      {
        doseNumberPositiveInt: im.dose_number ?? 1,
      },
    ],
  };
  if (completed) resource.occurrenceDateTime = im.administered_date;
  else if (im.scheduled_date) resource.occurrenceDateTime = im.scheduled_date;
  if (im.batch_number) resource.lotNumber = im.batch_number;
  if (im.administered_by) resource.performer = [{ actor: { reference: `Practitioner/${im.administered_by}` } }];
  return resource;
}

// ── OperationOutcome ───────────────────────────────────────────────────────

export function operationOutcome(
  severity: "fatal" | "error" | "warning" | "information",
  code: string,
  diagnostics: string
) {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity, code, diagnostics }],
  };
}
