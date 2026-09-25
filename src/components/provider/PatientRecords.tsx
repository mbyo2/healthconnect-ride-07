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
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const { data: records, isLoading } = useQuery({
    queryKey: ['medical_records'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // NOTE: comprehensive_medical_records.patient_id FKs point at
      // auth.users, so the `profiles!..._fkey` join hint is invalid
      // PostgREST. Patient names are fetched directly — the "Appointment
      // participants can view each other's profiles" RLS policy permits
      // participant rows; others resolve to null (already handled).
      const { data, error } = await supabase
        .from('comprehensive_medical_records')
        .select(`
          id,
          patient_id,
          record_type,
          description,
          visit_date
        `)
        .order('visit_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data as any[]) || [];
      const patientIds = [...new Set(rows.map((r) => r.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        patientMap = Object.fromEntries((patients || []).map((p: any) => [p.id, p]));
      }

      return rows.map(record => ({
        id: record.id,
        patient_id: record.patient_id,
        record_type: record.record_type,
        description: record.description,
        date: record.visit_date,
        patient: patientMap[record.patient_id] || null
      })) as PatientRecord[];
    }
  });

  const filteredRecords = records?.filter(record => {
    // patient join can be null under RLS (walk-in records) — never crash
    const first = record.patient?.first_name?.toLowerCase() || "";
    const last = record.patient?.last_name?.toLowerCase() || "";
    const q = searchTerm.toLowerCase();
    return first.includes(q) || last.includes(q);
  });

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
          <Button onClick={() => navigate("/medical-records")}>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords?.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {[record.patient?.first_name, record.patient?.last_name].filter(Boolean).join(" ") || "Patient"}
                </TableCell>
                <TableCell>{record.record_type}</TableCell>
                <TableCell>{record.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};