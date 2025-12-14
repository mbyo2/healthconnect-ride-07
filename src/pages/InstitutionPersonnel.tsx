
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PersonnelManagement } from "@/components/institution/PersonnelManagement";
import { Loader2 } from "lucide-react";

const InstitutionPersonnel = () => {
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
            }
            setLoading(false);
        };

        fetchInstitution();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (!institutionId) return <div className="p-8 text-center">Institution not found</div>;

    return (
        <div className="container mx-auto p-6">
            <PersonnelManagement institutionId={institutionId} />
        </div>
    );
};

export default InstitutionPersonnel;
