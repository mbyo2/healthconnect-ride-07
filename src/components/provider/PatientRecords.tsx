import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PatientRecord {
  id: string;
  patient_id: string;
  record_type: string;
  description: string;
  date: string;
  patient: {
    first_name: string;
    last_name: string;
  };
}

export const PatientRecords = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: records, isLoading } = useQuery({
    queryKey: ['medical_records'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('comprehensive_medical_records')
        .select(`
          id,
          patient_id,
          record_type,
          description,
          visit_date,
          patient:profiles!comprehensive_medical_records_patient_id_fkey(first_name, last_name)
        `)
        .order('visit_date', { ascending: false });

      if (error) throw error;

      return data.map(record => ({
        id: record.id,
        patient_id: record.patient_id,
        record_type: record.record_type,
        description: record.description,
        date: record.visit_date,
        patient: record.patient
      })) as PatientRecord[];
    }
  });

  const filteredRecords = records?.filter(record =>
    record.patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.patient.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Patient Records</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            New Record
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading records...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Record Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords?.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {record.patient.first_name} {record.patient.last_name}
                </TableCell>
                <TableCell>{record.record_type}</TableCell>
                <TableCell>{record.description}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};