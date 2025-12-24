import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const InstitutionPatients = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchPatients();
    }, [user]);

    const fetchPatients = async () => {
        if (!user) return;
        try {
            // 1. Get Institution ID
            const { data: inst, error: instError } = await supabase
                .from('healthcare_institutions')
                .select('id')
                .eq('admin_id', user.id)
                .single();

            if (instError) throw instError;
            if (!inst) return;

            // 2. Get Admissions
            const { data: admissions } = await supabase
                .from('hospital_admissions')
                .select('patient_id, status, admission_date, diagnosis')
                .eq('hospital_id', inst.id);

            // 3. Get Personnel (Providers)
            const { data: personnel } = await supabase
                .from('institution_personnel')
                .select('user_id')
                .eq('institution_id', inst.id);

            const providerIds = personnel?.map(p => p.user_id) || [];

            // 4. Get Appointments (if any providers)
            let appointments: any[] = [];
            if (providerIds.length > 0) {
                const { data: appts } = await supabase
                    .from('appointments')
                    .select('patient_id, date, status, type')
                    .in('provider_id', providerIds);
                appointments = appts || [];
            }

            // 5. Merge Patient IDs
            const patientIds = new Set([
                ...(admissions?.map(a => a.patient_id) || []),
                ...(appointments.map(a => a.patient_id) || [])
            ]);

            if (patientIds.size === 0) {
                setPatients([]);
                return;
            }

            // 6. Fetch Profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .in('id', Array.from(patientIds));

            // 7. Combine data
            const combined = profiles?.map(profile => {
                const admission = admissions?.find(a => a.patient_id === profile.id);
                // Find latest appointment
                const patientAppts = appointments.filter(a => a.patient_id === profile.id);
                const lastAppt = patientAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                return {
                    ...profile,
                    status: admission ? 'Admitted' : 'Outpatient',
                    admission_status: admission?.status,
                    last_visit: admission ? admission.admission_date : lastAppt?.date,
                    condition: admission?.diagnosis || lastAppt?.type || 'N/A'
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

    const filteredPatients = patients.filter(patient =>
        patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Patients</h1>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patients..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                        <div className="text-center py-8 text-muted-foreground">
                            No patients found associated with this institution.
                        </div>
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
                                    <TableRow key={patient.id}>
                                        <TableCell className="font-medium">
                                            {patient.first_name} {patient.last_name}
                                            <div className="text-xs text-muted-foreground">{patient.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={patient.status === 'Admitted' ? 'destructive' : 'secondary'}>
                                                {patient.status}
                                            </Badge>
                                            {patient.admission_status && (
                                                <div className="text-xs text-muted-foreground mt-1 capitalize">
                                                    {patient.admission_status}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{patient.condition}</TableCell>
                                        <TableCell>
                                            {patient.last_visit ? format(new Date(patient.last_visit), 'MMM d, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => toast.info("Patient details view coming soon")}>
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
        </div>
    );
};

export default InstitutionPatients;
