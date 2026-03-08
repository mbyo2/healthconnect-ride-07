import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeviceManagement } from "@/components/institution/DeviceManagement";
import { Loader2 } from "lucide-react";

const InstitutionDevices = () => {
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstitution = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('healthcare_institutions')
        .select('id')
        .eq('admin_id', user.id)
        .single();

      if (data) {
        setInstitutionId(data.id);
      } else {
        const { data: staffData } = await supabase
          .from('institution_staff')
          .select('institution_id')
          .eq('provider_id', user.id)
          .eq('is_active', true)
          .single();

        if (staffData) {
          setInstitutionId(staffData.institution_id);
        }
      }
      setLoading(false);
    };

    fetchInstitution();
  }, []);

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
