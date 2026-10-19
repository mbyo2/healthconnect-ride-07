import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileJson, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * FHIR Import: Receive and import a transferred health history bundle
 * into the current institution's records.
 */
export function FHIRImportPanel({ patientId }: { patientId: string }) {
  const { user } = useAuth();
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
              await importMedication(resource, patientId);
              results.success++;
              results.details.push(`✓ Medication: ${resource.medicationCodeableConcept?.text || resource.id}`);
              break;
            case "DiagnosticReport":
              await importDiagnosticReport(resource, patientId);
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
          results.details.push(`✗ Failed ${resource.resourceType}: ${err.message}`);
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
      toast.error("Import failed: " + error.message);
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
    created_at: obs.effectiveDateTime,
    metadata: {
      fhir_id: obs.id,
      imported: true,
      loinc_code: obs.code?.coding?.[0]?.code,
    },
  } as any);
  if (error) throw error;
}

async function importMedication(med: any, patientId: string) {
  const { error } = await supabase.from("pharmacy_prescriptions").insert({
    patient_id: patientId,
    medication_name: med.medicationCodeableConcept?.text,
    dosage: med.dosageInstruction?.[0]?.text,
    status: med.status === "completed" ? "dispensed" : "pending",
    created_at: med.authoredOn,
  } as any);
  if (error) throw error;
}

async function importDiagnosticReport(report: any, patientId: string) {
  const { error } = await supabase.from("lab_tests").insert({
    patient_id: patientId,
    test_type: report.code?.text,
    test_name: report.code?.text,
    status: report.status === "final" ? "completed" : "pending",
    result_value: report.conclusion,
    created_at: report.effectiveDateTime,
  } as any);
  if (error) throw error;
}

async function importAllergy(allergy: any, patientId: string) {
  const { error } = await supabase.from("patient_allergies").insert({
    patient_id: patientId,
    allergen: allergy.code?.text,
    allergy_name: allergy.code?.text,
    reaction: allergy.reaction?.[0]?.manifestation?.[0]?.text,
    status: "active",
    created_at: allergy.recordedDate,
  } as any);
  if (error) throw error;
}

async function importImmunization(imm: any, patientId: string) {
  const { error } = await supabase.from("immunizations").insert({
    patient_id: patientId,
    vaccine_name: imm.vaccineCode?.text,
    vaccine_code: imm.vaccineCode?.coding?.[0]?.code,
    administered_at: imm.occurrenceDateTime,
    lot_number: imm.lotNumber,
  } as any);
  if (error) throw error;
}
