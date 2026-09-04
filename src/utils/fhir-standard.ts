/**
 * HL7 FHIR (Fast Healthcare Interoperability Resources) R4 / R5 Engine
 * Doc' O Clock Standardized Health Data Exchange
 */

export interface FHIRPatient {
  resourceType: "Patient";
  id: string;
  identifier: Array<{
    system: string;
    value: string;
    use?: "official" | "usual" | "secondary";
  }>;
  active: boolean;
  name: Array<{
    use: "official" | "usual";
    family: string;
    given: string[];
  }>;
  telecom?: Array<{
    system: "phone" | "email" | "url";
    value: string;
    use?: "home" | "work" | "mobile";
  }>;
  gender: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  address?: Array<{
    use?: "home" | "work";
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface FHIRObservation {
  resourceType: "Observation";
  id: string;
  status: "registered" | "preliminary" | "final" | "amended" | "corrected";
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  referenceRange?: Array<{
    low?: { value: number; unit: string };
    high?: { value: number; unit: string };
    text?: string;
  }>;
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: "N" | "A" | "H" | "L" | "HH" | "LL" | "CRIT";
      display: string;
    }>;
  }>;
}

export interface FHIRCondition {
  resourceType: "Condition";
  id: string;
  clinicalStatus: {
    coding: Array<{
      system: string;
      code: "active" | "recurrence" | "relapse" | "inactive" | "remission" | "resolved";
    }>;
  };
  verificationStatus?: {
    coding: Array<{
      system: string;
      code: "confirmed" | "provisional" | "differential" | "refuted";
    }>;
  };
  code: {
    coding: Array<{
      system: "http://hl7.org/fhir/sid/icd-10" | "http://snomed.info/sct";
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  recordedDate?: string;
}

export interface FHIRMedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  status: "active" | "on-hold" | "cancelled" | "completed" | "entered-in-error" | "stopped" | "draft";
  intent: "order" | "proposal" | "plan";
  medicationCodeableConcept: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  authoredOn: string;
  dosageInstruction?: Array<{
    text: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
      };
    };
  }>;
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value: number;
      unit: string;
    };
  };
}

export interface FHIRDiagnosticReport {
  resourceType: "DiagnosticReport";
  id: string;
  status: "registered" | "partial" | "preliminary" | "final";
  category: Array<{
    coding: Array<{
      system: string;
      code: "LAB" | "RAD" | "SURG" | "GE";
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  issued: string;
  conclusion?: string;
}

export interface FHIRImagingStudy {
  resourceType: "ImagingStudy";
  id: string;
  status: "registered" | "available" | "cancelled";
  modality: Array<{
    system: "http://dicom.nema.org/resources/ontology/DCM";
    code: "CR" | "CT" | "MR" | "US" | "XA" | "DX" | "MG";
    display: string;
  }>;
  subject: {
    reference: string;
  };
  started?: string;
  numberOfSeries: number;
  numberOfInstances: number;
  description: string;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  id: string;
  type: "collection" | "transaction" | "document" | "searchset";
  timestamp: string;
  total?: number;
  entry: Array<{
    fullUrl: string;
    resource: FHIRPatient | FHIRObservation | FHIRCondition | FHIRMedicationRequest | FHIRDiagnosticReport | FHIRImagingStudy | any;
  }>;
}

/**
 * Converts Doc' O Clock Patient Profile to HL7 FHIR Patient Resource
 */
export function toFHIRPatient(profile: any): FHIRPatient {
  const given = (profile.first_name || "Unknown").split(" ");
  const family = profile.last_name || "";
  
  return {
    resourceType: "Patient",
    id: profile.id,
    identifier: [
      {
        system: "https://dococlock.com/patients/mrn",
        value: profile.id.substring(0, 8).toUpperCase(),
        use: "official",
      },
    ],
    active: true,
    name: [
      {
        use: "official",
        family,
        given,
      },
    ],
    telecom: [
      ...(profile.phone ? [{ system: "phone" as const, value: profile.phone, use: "mobile" as const }] : []),
      ...(profile.email ? [{ system: "email" as const, value: profile.email, use: "home" as const }] : []),
    ],
    gender: profile.gender === "male" ? "male" : profile.gender === "female" ? "female" : "other",
    birthDate: profile.date_of_birth || undefined,
    address: profile.city || profile.address ? [
      {
        use: "home",
        line: profile.address ? [profile.address] : undefined,
        city: profile.city || undefined,
        state: profile.state || undefined,
        postalCode: profile.zip_code || undefined,
        country: profile.country || "Zambia",
      },
    ] : undefined,
  };
}

/**
 * Converts Vitals / Lab observation to HL7 FHIR Observation Resource
 */
export function toFHIRObservation(metric: any, patientId: string): FHIRObservation {
  return {
    resourceType: "Observation",
    id: metric.id || `obs-${Date.now()}`,
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: metric.metric_category || "vital-signs",
            display: metric.metric_category === "vital_signs" ? "Vital Signs" : "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: metric.loinc_code || "8867-4",
          display: metric.metric_name || "Heart Rate",
        },
      ],
      text: metric.metric_name || "Health Measurement",
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: metric.recorded_at || new Date().toISOString(),
    valueQuantity: metric.value !== undefined ? {
      value: Number(metric.value),
      unit: metric.unit || "",
      system: "http://unitsofmeasure.org",
      code: metric.unit || "",
    } : undefined,
    interpretation: metric.status ? [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: metric.status === "normal" ? "N" : metric.status === "critical" ? "CRIT" : "A",
            display: metric.status.toUpperCase(),
          },
        ],
      },
    ] : undefined,
  };
}

/**
 * Builds a valid FHIR R4 Bundle JSON
 */
export function createFHIRBundle(resources: any[]): FHIRBundle {
  return {
    resourceType: "Bundle",
    id: `bundle-${Date.now().toString(36)}`,
    type: "collection",
    timestamp: new Date().toISOString(),
    total: resources.length,
    entry: resources.map((res) => ({
      fullUrl: `urn:uuid:${res.id || Math.random().toString(36).substring(2)}`,
      resource: res,
    })),
  };
}
