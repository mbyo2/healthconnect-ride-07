/**
 * Unified Provider Access Control
 * 
 * Combines three layers of protection:
 * 1. Relationship: Does provider have a relationship with this patient?
 * 2. Role: What is the provider's role allowed to see? (47-role matrix)
 * 3. Institution: Are they in the same institution? (multi-tenancy)
 * 
 * A provider can view patient data ONLY IF all three checks pass.
 */

import { supabase } from "@/integrations/supabase/client";
import { canAccess, type PatientDataScope } from "./provider-access-control";

export interface ProviderAccessResult {
  hasAccess: boolean;
  reason: string;
  allowedCategories: (keyof PatientDataScope)[];
}

/**
 * Checks if a provider can access a patient's data.
 * 
 * @param providerId - The provider's user ID
 * @param patientId - The patient's user ID  
 * @param providerRole - The provider's role (e.g., 'doctor', 'nurse', 'pharmacist')
 * @returns Access decision with reason
 */
export async function checkProviderAccess(
  providerId: string,
  patientId: string,
  providerRole: string
): Promise<ProviderAccessResult> {
  // Layer 1: Relationship check
  // Provider must have an appointment, consultation, or referral with patient
  const { data: hasRelationship } = await supabase
    .rpc("has_patient_relationship", { p_patient_id: patientId });
  
  if (!hasRelationship) {
    return {
      hasAccess: false,
      reason: "No provider-patient relationship. Access requires an appointment, consultation, or referral.",
      allowedCategories: [],
    };
  }

  // Layer 2: Institution check (multi-tenancy)
  // Provider and patient must share an institution
  const { data: providerInstitutions } = await supabase
    .from("institution_staff")
    .select("institution_id")
    .eq("provider_id", providerId)
    .eq("is_active", true);
  
  const { data: patientLinks } = await supabase
    .from("patient_institution_links")
    .select("institution_id")
    .eq("patient_id", patientId)
    .eq("status", "active");
  
  const providerInstIds = new Set((providerInstitutions || []).map((r: any) => r.institution_id));
  const patientInstIds = new Set((patientLinks || []).map((r: any) => r.institution_id));
  const sharedInstitutions = [...providerInstIds].filter(id => patientInstIds.has(id));
  
  if (sharedInstitutions.length === 0) {
    return {
      hasAccess: false,
      reason: "Provider and patient are not in the same institution.",
      allowedCategories: [],
    };
  }

  // Layer 3: Role-based filtering
  // What categories can this role see?
  const categories: (keyof PatientDataScope)[] = [
    "demographics", "appointments", "vitals", "labResults",
    "prescriptions", "allergies", "immunizations", "clinicalNotes", "billing"
  ];
  const allowedCategories = categories.filter(cat => canAccess(providerRole, cat));

  return {
    hasAccess: true,
    reason: `Access granted. Relationship verified, shared institution found, role '${providerRole}' authorized for ${allowedCategories.length} categories.`,
    allowedCategories,
  };
}

/**
 * Gets the patient health history filtered by provider's access level.
 * This is what providers should call instead of direct table queries.
 * 
 * @param providerId - Provider's user ID
 * @param patientId - Patient's user ID
 * @param providerRole - Provider's role
 * @returns Filtered patient data (only allowed categories)
 */
export async function getPatientHistoryForProvider(
  providerId: string,
  patientId: string,
  providerRole: string
) {
  const access = await checkProviderAccess(providerId, patientId, providerRole);
  
  if (!access.hasAccess) {
    throw new Error(`Access denied: ${access.reason}`);
  }

  const result: Record<string, any> = {
    _access: {
      granted: true,
      role: providerRole,
      categories: access.allowedCategories,
      reason: access.reason,
    }
  };

  // Fetch only allowed categories
  if (access.allowedCategories.includes("demographics")) {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, date_of_birth, gender, phone")
      .eq("id", patientId)
      .single();
    result.demographics = data;
  }

  if (access.allowedCategories.includes("vitals")) {
    const { data } = await supabase
      .from("vital_signs")
      .select("*")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(50);
    result.vitals = data;
  }

  if (access.allowedCategories.includes("labResults")) {
    const { data } = await supabase
      .from("lab_tests")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(50);
    result.labResults = data;
  }

  if (access.allowedCategories.includes("prescriptions")) {
    const { data } = await supabase
      .from("pharmacy_prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(50);
    result.prescriptions = data;
  }

  if (access.allowedCategories.includes("allergies")) {
    const { data } = await supabase
      .from("patient_allergies")
      .select("*")
      .eq("patient_id", patientId);
    result.allergies = data;
  }

  if (access.allowedCategories.includes("immunizations")) {
    const { data } = await supabase
      .from("immunizations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    result.immunizations = data;
  }

  // Note: clinicalNotes, appointments, billing would be fetched similarly
  // based on the allowed categories

  return result;
}
