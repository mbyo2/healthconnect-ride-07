import { ReferralManagement } from "@/components/hospital/ReferralManagement";

/**
 * Standalone referrals page for providers (doctors, specialists, etc.)
 * who need to create referrals without going through HospitalManagement.
 */
export default function Referrals() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <ReferralManagement />
    </div>
  );
}
