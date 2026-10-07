import { MaternalChild } from "@/components/hospital/MaternalChild";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone Maternal & Child Health page for clinical roles
 * (doctor, midwife, nurse, clinical officer) who need ANC/delivery/
 * immunization registers without going through HospitalManagement.
 */
export default function MaternalChildPage() {
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
      <div className="mb-4">
        <h1 className="text-xl font-bold">Maternal & Child Health</h1>
        <p className="text-sm text-muted-foreground">ANC visits, delivery register and immunizations for {hospital?.name || "your facility"}</p>
      </div>
      <MaternalChild hospital={hospital} />
    </div>
  );
}
