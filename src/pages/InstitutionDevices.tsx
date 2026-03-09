import { DeviceManagement } from "@/components/institution/DeviceManagement";
import { Loader2 } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

const InstitutionDevices = () => {
  const { institutionId, loading } = useInstitutionContext();

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!institutionId) return <div className="p-8 text-center text-muted-foreground">No institution found. Please register your institution first.</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Connected Devices & IoT</h1>
      <DeviceManagement institutionId={institutionId} />
    </div>
  );
};

export default InstitutionDevices;
