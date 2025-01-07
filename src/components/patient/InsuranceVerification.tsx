import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const InsuranceVerification = () => {
  const { data: insurance, isLoading } = useQuery({
    queryKey: ['insurance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('insurance_information')
        .select('*')
        .eq('patient_id', user.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div>Verifying insurance...</div>;
  }

  if (!insurance) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">Insurance Information Required</h3>
        </div>
        <p className="mt-2 text-gray-600">
          Please add your insurance information to enable verification.
        </p>
      </Card>
    );
  }

  const isActive = insurance.coverage_end_date
    ? new Date(insurance.coverage_end_date) > new Date()
    : true;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Insurance Details</h3>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status</span>
          <Badge variant={isActive ? "default" : "destructive"}>
            {isActive ? (
              <CheckCircle className="h-4 w-4 mr-1" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-1" />
            )}
            {isActive ? "Active" : "Expired"}
          </Badge>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Provider</span>
          <span className="font-medium">{insurance.provider_name}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Policy Number</span>
          <span className="font-medium">{insurance.policy_number}</span>
        </div>

        {insurance.group_number && (
          <div className="flex justify-between">
            <span className="text-gray-600">Group Number</span>
            <span className="font-medium">{insurance.group_number}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Coverage Start</span>
          <span className="font-medium">
            {format(new Date(insurance.coverage_start_date), 'PP')}
          </span>
        </div>

        {insurance.coverage_end_date && (
          <div className="flex justify-between">
            <span className="text-gray-600">Coverage End</span>
            <span className="font-medium">
              {format(new Date(insurance.coverage_end_date), 'PP')}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};