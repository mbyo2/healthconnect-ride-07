import { IPDWards as IPDWardsModule } from "@/components/hospital/IPDWards";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone IPD Wards page for clinical and front-desk staff
 * (doctors, nurses, clinical officers, receptionists) who need
 * ward/bed management without the full HospitalManagement console.
 */
export default function IPDWards() {
  const { institution: hospital, loading } = useInstitutionContext();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <IPDWardsModule hospital={hospital} />
    </div>
  );
}
