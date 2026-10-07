import { TeachingResearch } from "@/components/hospital/TeachingResearch";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone Teaching & Research page for teaching-hospital roles
 * (doctor, specialist, institution_admin) — student rotations,
 * research study registry and case discussions.
 */
export default function TeachingResearchPage() {
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
        <h1 className="text-xl font-bold">Teaching & Research</h1>
        <p className="text-sm text-muted-foreground">Student rotations, research studies and case discussions for {hospital?.name || "your facility"}</p>
      </div>
      <TeachingResearch hospital={hospital} />
    </div>
  );
}
