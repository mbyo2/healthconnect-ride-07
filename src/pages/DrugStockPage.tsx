import { DrugStock } from "@/components/hospital/DrugStock";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone Drug Stock page for institutional medicine inventory
 * (pharmacists, doctors, institution admins, inventory managers).
 */
export default function DrugStockPage() {
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
      <DrugStock hospital={hospital} />
    </div>
  );
}
