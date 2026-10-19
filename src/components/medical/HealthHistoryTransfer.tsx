import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Share2, Upload, FileJson, ShieldCheck } from "lucide-react";
import {
  toFHIRPatient,
  toFHIRObservation,
  toFHIRMedicationRequest,
  toFHIRDiagnosticReport,
  toFHIRAllergy,
  toFHIRImmunization,
  createFHIRBundle,
} from "@/utils/fhir-standard";

/**
 * Health History Transfer: Export patient data as FHIR bundle,
 * transfer between institutions with patient consent.
 */
export function HealthHistoryTransfer({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [includeVitals, setIncludeVitals] = useState(true);
  const [includeLabs, setIncludeLabs] = useState(true);
  const [includeMeds, setIncludeMeds] = useState(true);
  const [includeAllergies, setIncludeAllergies] = useState(true);
  const [includeImmunizations, setIncludeImmunizations] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Get available institutions for transfer
  const { data: institutions } = useQuery({
    queryKey: ["transfer-institutions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("healthcare_institutions")
        .select("id, name, institution_type")
        .order("name");
      return (data as any[]) || [];
    },
  });

  // Get patient profile
  const { data: profile } = useQuery({
    queryKey: ["transfer-patient-profile", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", patientId)
        .single();
      return data;
    },
    enabled: !!patientId,
  });

  const exportHealthHistory = async () => {
    if (!consentGiven) {
      toast.error("Patient consent is required for health data transfer");
      return;
    }
    if (!selectedInstitution) {
      toast.error("Please select a destination institution");
      return;
    }

    setExporting(true);
    try {
      const resources: any[] = [];

      // Patient demographics
      if (profile) {
        resources.push(toFHIRPatient(profile));
      }

      // Vitals
      if (includeVitals) {
        const { data: vitals } = await supabase
          .from("vital_signs")
          .select("*")
          .eq("user_id", patientId)
          .order("created_at", { ascending: false })
          .limit(100);
        (vitals || []).forEach((v: any) => {
          // Convert each vital sign to observation
          const metrics = [
            { key: "heart_rate", loinc: "8867-4", name: "Heart Rate", unit: "beats/min" },
            { key: "blood_pressure_systolic", loinc: "8480-6", name: "BP Systolic", unit: "mmHg" },
            { key: "temperature", loinc: "8310-5", name: "Temperature", unit: "Cel" },
          ];
          metrics.forEach(m => {
            if (v[m.key] != null) {
              resources.push(toFHIRObservation({
                id: `${v.id}-${m.key}`,
                loinc_code: m.loinc,
                metric_name: m.name,
                value: v[m.key],
                unit: m.unit,
                recorded_at: v.created_at,
                metric_category: "vital-signs",
              }, patientId));
            }
          });
        });
      }

      // Lab tests
      if (includeLabs) {
        const { data: labs } = await supabase
          .from("lab_tests")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(50);
        (labs || []).forEach((lab: any) => {
          resources.push(toFHIRDiagnosticReport(lab, patientId));
        });
      }

      // Prescriptions
      if (includeMeds) {
        const { data: meds } = await supabase
          .from("pharmacy_prescriptions")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(50);
        (meds || []).forEach((rx: any) => {
          resources.push(toFHIRMedicationRequest(rx, patientId));
        });
      }

      // Allergies
      if (includeAllergies) {
        const { data: allergies } = await supabase
          .from("patient_allergies")
          .select("*")
          .eq("patient_id", patientId);
        (allergies || []).forEach((a: any) => {
          resources.push(toFHIRAllergy(a, patientId));
        });
      }

      // Immunizations
      if (includeImmunizations) {
        const { data: imms } = await supabase
          .from("immunizations")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        (imms || []).forEach((imm: any) => {
          resources.push(toFHIRImmunization(imm, patientId));
        });
      }

      // Create FHIR bundle
      const bundle = createFHIRBundle(resources);

      // Log the transfer (audit trail)
      await supabase.from("health_data_transfers").insert({
        patient_id: patientId,
        from_institution_id: null, // Current institution (to be determined)
        to_institution_id: selectedInstitution,
        transferred_by: user?.id,
        resource_count: resources.length,
        consent_given: true,
        transfer_type: "export",
      } as any);

      // Download as JSON
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-history-${patientId.substring(0, 8)}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${resources.length} health records as FHIR bundle`);
    } catch (error: any) {
      toast.error("Export failed: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Transfer Health History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Patient health data transfer requires explicit patient consent. 
            Only the selected data categories will be included in the export.
          </p>
        </div>

        <div>
          <Label>Destination Institution</Label>
          <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
            <SelectTrigger>
              <SelectValue placeholder="Select institution..." />
            </SelectTrigger>
            <SelectContent>
              {(institutions || []).map((inst: any) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name} ({inst.institution_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data to Include</Label>
          {[
            { id: "vitals", label: "Vital Signs", checked: includeVitals, setter: setIncludeVitals },
            { id: "labs", label: "Lab Results", checked: includeLabs, setter: setIncludeLabs },
            { id: "meds", label: "Prescriptions", checked: includeMeds, setter: setIncludeMeds },
            { id: "allergies", label: "Allergies", checked: includeAllergies, setter: setIncludeAllergies },
            { id: "immunizations", label: "Immunizations", checked: includeImmunizations, setter: setIncludeImmunizations },
          ].map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={item.id}
                checked={item.checked}
                onCheckedChange={(c) => item.setter(c === true)}
              />
              <Label htmlFor={item.id} className="font-normal">{item.label}</Label>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2 border-t pt-4">
          <Checkbox
            id="consent"
            checked={consentGiven}
            onCheckedChange={(c) => setConsentGiven(c === true)}
          />
          <Label htmlFor="consent" className="font-medium">
            Patient has given explicit consent for this health data transfer
          </Label>
        </div>

        <Button
          onClick={exportHealthHistory}
          disabled={exporting || !consentGiven || !selectedInstitution}
          className="w-full"
        >
          {exporting ? (
            "Exporting..."
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export & Transfer Health History (FHIR)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
