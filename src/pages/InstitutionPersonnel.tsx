import { StaffManagement } from "@/components/institution/StaffManagement";
import { Loader2 } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

const InstitutionPersonnel = () => {
  const { institutionId, loading } = useInstitutionContext();

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!institutionId) return <div className="p-8 text-center text-muted-foreground">No institution found. Please register your institution first.</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <StaffManagement institutionId={institutionId} />
    </div>
  );
};

export default InstitutionPersonnel;
