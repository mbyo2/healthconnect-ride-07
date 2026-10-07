import { Procurement } from "@/components/hospital/Procurement";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone procurement page for institution staff (admins, inventory
 * managers) who need to manage purchase orders and suppliers without
 * going through HospitalManagement.
 */
export default function ProcurementPage() {
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
      <Procurement hospital={hospital} />
    </div>
  );
}
