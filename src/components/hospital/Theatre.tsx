import { OTManagement } from "@/components/hospital/OTManagement";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2, Scissors } from "lucide-react";

/**
 * Standalone Theatre (Operating Theatre) page for clinical staff
 * (doctors, specialists, clinical officers, nurses, OT staff) who need to
 * view the OT schedule and book surgery slots without going through
 * HospitalManagement. Linked from the OT staff dashboard ("Theatre Schedule",
 * "Book Theatre" quick actions).
 *
 * Renders the shared OTManagement module with the user's institution context:
 * schedule list, book-OT-slot form (with anaesthesia + consent workflows) and
 * today's-schedule summary.
 */
export default function Theatre() {
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
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-teal-500/10">
          <Scissors className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Operating Theatre</h1>
          <p className="text-sm text-muted-foreground">
            Surgical scheduling &amp; theatre management
            {hospital?.name ? ` · ${hospital.name}` : ""}
          </p>
        </div>
      </div>
      <OTManagement hospital={hospital} />
    </div>
  );
}
