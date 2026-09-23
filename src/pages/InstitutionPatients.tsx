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
        // Paginate — a single response caps out (PostgREST default 1000
        // rows) and would silently drop patients at large institutions.
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          const { data, error: apptsError } = await supabase
            .from('appointments')
            .select('patient_id, date, status, type')
            .in('provider_id', providerIds)
            .order('date', { ascending: true })
            .range(from, from + pageSize - 1);
          if (apptsError) throw apptsError;
          const page = data || [];
          appointments = appointments.concat(page);
          if (page.length < pageSize) break;
        }
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

  if (instLoading || loading) return <div className="min-h-screen bg-canvas flex items-center justify-center p-6" role="status" aria-label="Loading patients"><div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" aria-hidden /><span className="sr-only">Loading patients</span></div>;

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-content mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button"><Users className="h-5 w-5" /></div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">Patients</h1>
              <p className="text-sm text-graphite-500 font-medium tracking-wide">{patients.length} patient{patients.length !== 1 ? 's' : ''} · institutional scope</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-graphite-400" aria-hidden />
            <Input type="search" placeholder="Search patients..." aria-label="Search patients" className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">

      <div className="vf-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-canvas-silk flex items-center justify-between">
          <h2 className="font-medium text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary-500" /> Patient List ({patients.length})</h2>
        </div>
        <div className="p-5">
          {patients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No patients found.</div>
          ) : (
          <div className="overflow-x-auto">
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Condition/Type</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
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
                      <Button variant="ghost" size="sm" aria-label={`View ${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'View patient'} onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </div>
      </div>

      <PatientDetailSheet
        patientId={selectedPatientId}
        open={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
    </div>
  );
};

export default InstitutionPatients;
