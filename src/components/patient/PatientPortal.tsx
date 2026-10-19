import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, FileText, Pill } from "lucide-react";
import { getAccessibleCategories } from "@/utils/provider-access-control";

/**
 * Patient Portal: Shows patient's linked institutions and what they can access.
 * Restricted permissions: patients see own data only, no admin functions.
 */
export function PatientPortal() {
  const { user } = useAuth();

  // Get patient's institution links
  const { data: links, isLoading } = useQuery({
    queryKey: ["patient-institutions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("patient_institution_links")
        .select(`
          id,
          status,
          enrolled_at,
          healthcare_institutions!patient_institution_links_institution_id_fkey (
            id, name, institution_type, city
          )
        `)
        .eq("patient_id", user.id)
        .eq("status", "active")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user?.id,
  });

  // Get what the patient can access (from least-privilege matrix)
  const accessibleCategories = getAccessibleCategories("patient");

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading your institutions...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            My Healthcare Institutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not linked to any institutions yet. Contact your healthcare
              provider to get linked.
            </p>
          ) : (
            <div className="grid gap-3">
              {links?.map((link: any) => (
                <div
                  key={link.id}
                  className="border rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {link.healthcare_institutions?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {link.healthcare_institutions?.institution_type} •{" "}
                      {link.healthcare_institutions?.city}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Enrolled {new Date(link.enrolled_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="default">{link.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What You Can Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            As a patient, you have access to your own health records across all
            linked institutions. You cannot access other patients' data or
            administrative functions.
          </p>
          <div className="flex flex-wrap gap-2">
            {accessibleCategories.map((cat) => (
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
