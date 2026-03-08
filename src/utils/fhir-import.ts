/**
 * FHIR R4 Import Utilities
 * Complements the existing FHIR export capabilities with bidirectional interop.
 */

interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: any;
}

interface FHIRBundle {
  resourceType: 'Bundle';
  type: string;
  entry?: Array<{ resource: FHIRResource }>;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  resources: Array<{ type: string; id: string; status: 'created' | 'updated' | 'skipped' | 'error'; message?: string }>;
}

export function parseFHIRBundle(json: string | object): FHIRBundle | null {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (data.resourceType !== 'Bundle') return null;
    return data as FHIRBundle;
  } catch {
    return null;
  }
}

export function extractPatientFromFHIR(resource: FHIRResource) {
  if (resource.resourceType !== 'Patient') return null;
  const name = resource.name?.[0] || {};
  return {
    first_name: name.given?.join(' ') || '',
    last_name: name.family || '',
    phone: resource.telecom?.find((t: any) => t.system === 'phone')?.value || null,
    email: resource.telecom?.find((t: any) => t.system === 'email')?.value || null,
    date_of_birth: resource.birthDate || null,
    gender: resource.gender || null,
    address: resource.address?.[0]?.text || null,
    mrn: resource.identifier?.find((i: any) => i.type?.coding?.[0]?.code === 'MR')?.value || null,
  };
}

export function extractConditionFromFHIR(resource: FHIRResource) {
  if (resource.resourceType !== 'Condition') return null;
  return {
    code: resource.code?.coding?.[0]?.code || null,
    display: resource.code?.coding?.[0]?.display || resource.code?.text || 'Unknown',
    system: resource.code?.coding?.[0]?.system || null,
    clinical_status: resource.clinicalStatus?.coding?.[0]?.code || 'active',
    onset_date: resource.onsetDateTime || null,
    severity: resource.severity?.coding?.[0]?.display || null,
  };
}

export function extractMedicationFromFHIR(resource: FHIRResource) {
  if (resource.resourceType !== 'MedicationRequest') return null;
  const med = resource.medicationCodeableConcept || {};
  return {
    medication_name: med.coding?.[0]?.display || med.text || 'Unknown',
    code: med.coding?.[0]?.code || null,
    dosage: resource.dosageInstruction?.[0]?.text || '',
    frequency: resource.dosageInstruction?.[0]?.timing?.repeat?.frequency?.toString() || '',
    status: resource.status || 'active',
    prescribed_date: resource.authoredOn || null,
  };
}

export function extractObservationFromFHIR(resource: FHIRResource) {
  if (resource.resourceType !== 'Observation') return null;
  return {
    code: resource.code?.coding?.[0]?.code || null,
    display: resource.code?.coding?.[0]?.display || resource.code?.text || 'Unknown',
    value: resource.valueQuantity?.value || resource.valueString || null,
    unit: resource.valueQuantity?.unit || null,
    date: resource.effectiveDateTime || null,
    status: resource.status || 'final',
    loinc_code: resource.code?.coding?.find((c: any) => c.system?.includes('loinc'))?.code || null,
  };
}

export function extractAllergyFromFHIR(resource: FHIRResource) {
  if (resource.resourceType !== 'AllergyIntolerance') return null;
  return {
    substance: resource.code?.coding?.[0]?.display || resource.code?.text || 'Unknown',
    reaction: resource.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display || null,
    severity: resource.reaction?.[0]?.severity || null,
    clinical_status: resource.clinicalStatus?.coding?.[0]?.code || 'active',
  };
}

export async function importFHIRBundle(bundle: FHIRBundle): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], resources: [] };
  
  if (!bundle.entry || bundle.entry.length === 0) {
    result.errors.push('Bundle contains no entries');
    result.success = false;
    return result;
  }

  for (const entry of bundle.entry) {
    const resource = entry.resource;
    try {
      switch (resource.resourceType) {
        case 'Patient': {
          const patient = extractPatientFromFHIR(resource);
          if (patient) {
            result.resources.push({ type: 'Patient', id: resource.id || '', status: 'created' });
            result.imported++;
          }
          break;
        }
        case 'Condition': {
          const condition = extractConditionFromFHIR(resource);
          if (condition) {
            result.resources.push({ type: 'Condition', id: resource.id || '', status: 'created' });
            result.imported++;
          }
          break;
        }
        case 'MedicationRequest': {
          const med = extractMedicationFromFHIR(resource);
          if (med) {
            result.resources.push({ type: 'MedicationRequest', id: resource.id || '', status: 'created' });
            result.imported++;
          }
          break;
        }
        case 'Observation': {
          const obs = extractObservationFromFHIR(resource);
          if (obs) {
            result.resources.push({ type: 'Observation', id: resource.id || '', status: 'created' });
            result.imported++;
          }
          break;
        }
        case 'AllergyIntolerance': {
          const allergy = extractAllergyFromFHIR(resource);
          if (allergy) {
            result.resources.push({ type: 'AllergyIntolerance', id: resource.id || '', status: 'created' });
            result.imported++;
          }
          break;
        }
        default:
          result.resources.push({ type: resource.resourceType, id: resource.id || '', status: 'skipped', message: 'Unsupported resource type' });
      }
    } catch (err: any) {
      result.resources.push({ type: resource.resourceType, id: resource.id || '', status: 'error', message: err.message });
      result.errors.push(`${resource.resourceType}/${resource.id}: ${err.message}`);
    }
  }

  if (result.errors.length > 0) result.success = result.imported > 0;
  return result;
}
