import { ICU } from "@/components/hospital/ICU";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone ICU page for clinical staff (doctors, specialists, nurses,
 * clinical officers) who need ICU bed/observation access without going
 * through HospitalManagement.
 */
export default function ICUPage() {
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
      <ICU hospital={hospital} />
    </div>
  );
}
