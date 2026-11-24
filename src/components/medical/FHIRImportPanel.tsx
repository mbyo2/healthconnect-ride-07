import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

/**
 * FHIR Import: Receive and import a transferred health history bundle
 * into the current institution's records.
 */
export function FHIRImportPanel({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const { institutionId } = useInstitutionContext();

  // lab_tests.lab_id is NOT NULL: the receiving facility is the active
  // institution when there is one, otherwise the first facility whose
  // roster this patient is on. Without either, a DiagnosticReport cannot
  // be filed and is reported as failed (plain language) instead of
  // silently writing a row the database will reject.
  const resolveLabId = async (): Promise<string | null> => {
    if (institutionId) return institutionId;
    const { data } = await (supabase.from("institution_patients" as any) as any)
      .select("institution_id")
      .eq("patient_id", patientId)
      .limit(1)
      .maybeSingle();
    return (data as any)?.institution_id ?? null;
  };
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    details: string[];
  } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const bundle = JSON.parse(text);

      if (bundle.resourceType !== "Bundle") {
        throw new Error("Invalid FHIR Bundle: resourceType must be 'Bundle'");
      }

      const results = { success: 0, failed: 0, details: [] as string[] };

      for (const entry of bundle.entry || []) {
        const resource = entry.resource;
        if (!resource) continue;

        try {
          switch (resource.resourceType) {
            case "Observation":
              await importObservation(resource, patientId);
              results.success++;
              results.details.push(`✓ Observation: ${resource.code?.text || resource.id}`);
              break;
            case "MedicationRequest":
              await importMedication(resource, patientId, user?.id);
              results.success++;
              results.details.push(`✓ Medication: ${resource.medicationCodeableConcept?.text || resource.id}`);
              break;
            case "DiagnosticReport":
              await importDiagnosticReport(resource, patientId, await resolveLabId());
              results.success++;
              results.details.push(`✓ Lab Report: ${resource.code?.text || resource.id}`);
              break;
            case "AllergyIntolerance":
              await importAllergy(resource, patientId);
              results.success++;
              results.details.push(`✓ Allergy: ${resource.code?.text || resource.id}`);
              break;
            case "Immunization":
              await importImmunization(resource, patientId);
              results.success++;
              results.details.push(`✓ Immunization: ${resource.vaccineCode?.text || resource.id}`);
              break;
            case "Patient":
              // Patient demographics already exist; skip
              results.details.push(`○ Patient demographics skipped (already exists)`);
              break;
            default:
              results.details.push(`○ Skipped unsupported: ${resource.resourceType}`);
          }
        } catch (err: any) {
          results.failed++;
          results.details.push(`✗ Failed ${resource.resourceType}: ${friendlyErrorMessage(err, "Import failed")}`);
        }
      }

      // Log the import
      await supabase.from("health_data_transfers").insert({
        patient_id: patientId,
        to_institution_id: null, // Current institution
        transferred_by: user?.id,
        transfer_type: "import",
        resource_count: results.success,
        consent_given: true,
        status: results.failed > 0 ? "completed" : "completed",
        notes: `Imported ${results.success} resources, ${results.failed} failed`,
      } as any);

      setImportResult(results);
      toast.success(`Imported ${results.success} records`);
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Import failed. Please try again."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Health History (FHIR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a FHIR bundle exported from another institution to import
          the patient's health history into this institution's records.
        </p>

        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <FileJson className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <label className="cursor-pointer">
            <span className="text-sm font-medium text-primary hover:underline">
              {importing ? "Importing..." : "Select FHIR Bundle JSON file"}
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>

        {importResult && (
          <div className="space-y-2 border rounded-lg p-4">
            <div className="flex items-center gap-2 font-medium">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              Import Complete: {importResult.success} succeeded, {importResult.failed} failed
            </div>
            <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {importResult.details.map((d, i) => (
                <div key={i} className="font-mono text-xs">{d}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Import helpers - convert FHIR back to Doc'O Clock schema

async function importObservation(obs: any, patientId: string) {
  // Map FHIR Observation to vital_signs
  // This is simplified; real implementation would map LOINC codes
  const { error } = await supabase.from("vital_signs").insert({
    user_id: patientId,
    // vital_signs has no created_at column (live schema) — the observation
    // time belongs in recorded_at; selecting/inserting created_at 400s.
    recorded_at: obs.effectiveDateTime,
    metadata: {
      fhir_id: obs.id,
      imported: true,
      loinc_code: obs.code?.coding?.[0]?.code,
    },
  } as any);
  if (error) throw error;
}

async function importMedication(med: any, patientId: string, doctorId?: string) {
  if (!doctorId) throw new Error("You need to be signed in to import medication history.");
  const { error } = await supabase.from("pharmacy_prescriptions").insert({
    patient_id: patientId,
    // Live NOT NULLs: doctor_id, prescription_number, valid_until and the
    // medications jsonb (there are no medication_name/dosage columns).
    doctor_id: doctorId,
    prescription_number: `FHIR-${med.id || Date.now()}`,
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    medications: [{
      name: med.medicationCodeableConcept?.text,
      dosage: med.dosageInstruction?.[0]?.text,
    }],
    // Live status CHECK: pending/filled/partially_filled/cancelled/expired
    // ("dispensed" is not an allowed value).
    status: med.status === "completed" ? "filled" : "pending",
    created_at: med.authoredOn,
  } as any);
  if (error) throw error;
}

async function importDiagnosticReport(report: any, patientId: string, labId: string | null) {
  if (!labId) {
    throw new Error("No facility is linked to this patient yet, so the lab report could not be filed. Open the patient from a facility workspace and try again.");
  }
  const { error } = await supabase.from("lab_tests").insert({
    patient_id: patientId,
    // Live NOT NULLs: lab_id, test_number, test_type (there are no
    // test_name/result_value columns — the outcome lives in
    // result/result_summary + results_date). The attribution CHECK
    // requires ordered_by to stay null for external_referral rows and
    // external_referrer_name to be set.
    lab_id: labId,
    institution_id: labId,
    test_type: report.code?.text || "Imported lab report",
    test_number: `FHIR-${report.id || Date.now()}`,
    status: report.status === "final" ? "completed" : "pending",
    result: report.conclusion || null,
    result_summary: report.conclusion || null,
    results_date: report.effectiveDateTime || null,
    order_source: "external_referral",
    external_referrer_name: "FHIR import",
  } as any);
  if (error) throw error;
}

async function importAllergy(allergy: any, patientId: string) {
  const { error } = await supabase.from("patient_allergies").insert({
    patient_id: patientId,
    // patient_allergies has no allergen/allergy_name/status columns (live
    // schema) — the name is allergen_name and active state is is_active.
    allergen_name: allergy.code?.text,
    reaction: allergy.reaction?.[0]?.manifestation?.[0]?.text,
    is_active: true,
    reported_at: allergy.recordedDate,
  } as any);
  if (error) throw error;
}

async function importImmunization(imm: any, patientId: string) {
  const { error } = await supabase.from("immunizations").insert({
    patient_id: patientId,
    vaccine_name: imm.vaccineCode?.text,
    // immunizations has no vaccine_code/administered_at/lot_number columns
    // (live schema) — the date is administered_date, the lot is batch_number,
    // and the vaccine code rides in notes-free form via vaccine_name only.
    administered_date: imm.occurrenceDateTime,
    scheduled_date: imm.occurrenceDateTime,
    batch_number: imm.lotNumber,
  } as any);
  if (error) throw error;
}
