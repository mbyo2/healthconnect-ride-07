import { StaffManagement } from "@/components/institution/StaffManagement";
import { InstitutionSwitcher } from "@/components/institution/InstitutionSwitcher";
import { Loader2 } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

const InstitutionPersonnel = () => {
  const { institutionId, affiliations, switchInstitution, loading } = useInstitutionContext();

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!institutionId) return <div className="p-8 text-center text-muted-foreground">No institution found. Please register your institution first.</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      {affiliations.length > 1 && (
        <div className="flex justify-end mb-3">
          <InstitutionSwitcher
            affiliations={affiliations}
            activeId={institutionId}
            onSwitch={switchInstitution}
            tone="light"
          />
        </div>
      )}
      <StaffManagement institutionId={institutionId} />
    </div>
  );
};

export default InstitutionPersonnel;
