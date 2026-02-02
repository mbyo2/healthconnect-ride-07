import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  instructions: string;
  prescribed_date: string;
  notes?: string;
}

export const PrescriptionList = () => {
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('comprehensive_prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return data as unknown as Prescription[];
    }
  });

  if (isLoading) {
    return <div>Loading prescriptions...</div>;
  }

  return (
    <div className="space-y-4">
      {prescriptions?.map((prescription) => (
        <Card key={prescription.id} className="p-4">
          <h3 className="font-semibold">{prescription.medication_name}</h3>
          <p className="text-sm text-gray-600">Dosage: {prescription.dosage}</p>
          <p className="text-sm text-gray-600">Instructions: {prescription.instructions}</p>
          <p className="text-sm text-gray-600">
            Prescribed: {format(new Date(prescription.prescribed_date), 'PPP')}
          </p>
          {prescription.notes && (
            <p className="text-sm text-gray-600 mt-2">Notes: {prescription.notes}</p>
          )}
        </Card>
      ))}

      {(!prescriptions || prescriptions.length === 0) && (
        <div className="text-center text-gray-500 py-8">
          No prescriptions found
        </div>
      )}
    </div>
  );
};