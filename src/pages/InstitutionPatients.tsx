import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { PatientDetailSheet } from "@/components/institution/PatientDetailSheet";

const InstitutionPatients = () => {
  const { institution, loading: instLoading } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (!institution) { setLoading(false); return; }
    fetchPatients();
  }, [institution]);

  const fetchPatients = async () => {
    if (!institution) return;
    try {
      const instId = institution.id;

      const [admRes, personnelRes] = await Promise.all([
        supabase.from('hospital_admissions').select('patient_id, status, admission_date, diagnosis').eq('hospital_id', instId),
        supabase.from('institution_personnel').select('user_id').eq('institution_id', instId),
      ]);

      const providerIds = personnelRes.data?.map(p => p.user_id) || [];
      let appointments: any[] = [];
      if (providerIds.length > 0) {
        const { data } = await supabase.from('appointments').select('patient_id, date, status, type').in('provider_id', providerIds);
        appointments = data || [];
      }

      const patientIds = new Set([
        ...(admRes.data?.map(a => a.patient_id) || []),
        ...appointments.map(a => a.patient_id),
      ]);

      if (patientIds.size === 0) { setPatients([]); return; }

      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(patientIds));

      const combined = profiles?.map(profile => {
        const admission = admRes.data?.find(a => a.patient_id === profile.id);
        const patientAppts = appointments.filter(a => a.patient_id === profile.id);
        const lastAppt = patientAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return {
          ...profile,
          status: admission?.status === 'admitted' ? 'Admitted' : 'Outpatient',
          admission_status: admission?.status,
          last_visit: admission ? admission.admission_date : lastAppt?.date,
          condition: admission?.diagnosis || lastAppt?.type || 'N/A',
        };
      });

      setPatients(combined || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (instLoading || loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Patients</h1>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patients..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Patient List ({patients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No patients found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition/Type</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedPatientId(patient.id)}>
                    <TableCell className="font-medium">
                      {patient.first_name} {patient.last_name}
                      <div className="text-xs text-muted-foreground">{patient.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={patient.status === 'Admitted' ? 'destructive' : 'secondary'}>{patient.status}</Badge>
                      {patient.admission_status && (
                        <div className="text-xs text-muted-foreground mt-1 capitalize">{patient.admission_status}</div>
                      )}
                    </TableCell>
                    <TableCell>{patient.condition}</TableCell>
                    <TableCell>{patient.last_visit ? format(new Date(patient.last_visit), 'MMM d, yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PatientDetailSheet
        patientId={selectedPatientId}
        open={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
  );
};

export default InstitutionPatients;
