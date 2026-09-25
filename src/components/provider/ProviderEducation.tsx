
import React from "react";
import { Card } from "@/components/ui/card";
import { GraduationCap, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProviderEducationProps {
  providerId: string | undefined;
}

// Real education data from the provider's own profile (edited in the
// "My Practice" tab of the provider dashboard). No mock credentials —
// unprovided details render as an honest empty state.
export const ProviderEducation: React.FC<ProviderEducationProps> = ({ providerId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["provider-education", providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const { data, error } = await supabase
        .from("provider_directory")
        .select("medical_school, graduation_year, board_certifications")
        .eq("id", providerId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        medical_school: string | null;
        graduation_year: number | null;
        board_certifications: string[] | null;
      } | null;
    },
    enabled: !!providerId,
  });

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading education…</div>;
  }

  const certifications = data?.board_certifications ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </h2>

        {data?.medical_school ? (
          <div className="border-l-2 border-primary pl-4 pb-4 last:pb-0">
            <p className="font-semibold">{data.medical_school}</p>
            {data.graduation_year && (
              <p className="text-sm text-muted-foreground">Class of {data.graduation_year}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Education details not provided yet.</p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications & Licenses
        </h2>

        {certifications.length > 0 ? (
          <div className="space-y-3">
            {certifications.map(cert => (
              <div key={cert} className="flex justify-between items-center">
                <p className="font-medium">{cert}</p>
                <Badge variant="outline">Certified</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No certifications listed yet.</p>
        )}
      </Card>
    </div>
  );
};
