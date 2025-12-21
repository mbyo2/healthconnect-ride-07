import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MedicalRecord {
  id: string;
  record_type: string;
  description: string;
  date: string;
}

export const MedicalHistory = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('comprehensive_medical_records')
        .select('*')
        .eq('patient_id', user.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;

      setRecords(data.map(record => ({
        id: record.id,
        record_type: record.record_type,
        description: record.description,
        date: record.visit_date
      })) || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast({
        title: "Error",
        description: "Failed to load medical records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Medical History</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <span>Loading...</span>
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No medical records found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {record.record_type}
                </CardTitle>
                <div className="text-sm text-gray-500">
                  {new Date(record.date).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{record.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};