import { Imaging } from "@/components/hospital/Imaging";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone imaging page for providers (doctors, radiologists, specialists,
 * clinical officers) who need to order imaging and review radiology reports
 * without going through HospitalManagement.
 */
export default function ImagingPage() {
  const { institution: hospital, loading } = useInstitutionContext();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Imaging hospital={hospital} />
    </div>
  );
}
