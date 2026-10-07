import { ReferralManagement } from "@/components/hospital/ReferralManagement";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Loader2 } from "lucide-react";

/**
 * Standalone referrals page for providers (doctors, specialists, etc.)
 * who need to create referrals without going through HospitalManagement.
 */
export default function Referrals() {
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
      <ReferralManagement hospital={hospital} />
    </div>
  );
}
