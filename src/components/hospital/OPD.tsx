import { OPDManagement } from "@/components/hospital/OPDManagement";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2, Stethoscope } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Standalone OPD (Outpatient Department) page for clinical staff.
 * Renders the shared OPDManagement module with the user's institution context:
 * queue tokens, check-in, triage, and admit-to-IPD.
 */
export default function OPD() {
  const { institution: hospital, loading } = useInstitutionContext();
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (!hospital?.id) return;
    supabase
      .from("hospital_departments")
      .select("*")
      .eq("institution_id", hospital.id)
      .then(({ data }) => setDepartments(data || []));
  }, [hospital?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-600">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Outpatient Department</h1>
          <p className="text-sm text-graphite-500">
            Queue management, triage & check-in · {hospital?.name || "Doc'O Clock"}
          </p>
        </div>
      </div>
      <OPDManagement hospital={hospital} departments={departments} />
    </div>
  );
}
