import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const InstitutionAppointments = () => {
    const { user } = useAuth();
    const { institution, institutionId, loading: instLoading } = useInstitutionContext();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);

    useEffect(() => {
        fetchAppointments();
    }, [institutionId]);

    const fetchAppointments = async () => {
        if (!institutionId) { setLoading(false); return; }
        setLoading(true);
        try {
            // Use the SECURITY DEFINER RPC so patient/provider names resolve
            // without tripping profiles RLS recursion. The function enforces
            // institution staff/admin authorization internally and matches
            // appointments by provider affiliation OR direct institution_id
            // linkage (set at booking time via trg_set_appointment_institution).
            const { data: appts, error: apptsError } = await supabase
                .rpc('get_institution_appointments', { p_institution_id: institutionId });

            if (apptsError) throw apptsError;
            // Normalize RPC shape to what the table renderer expects
            const normalized = (appts || []).map((a: any) => ({
                ...a,
                date: a.appointment_date,
                time: a.appointment_time,
                type: a.appointment_type,
                patient: {
                    first_name: a.patient_first_name,
                    last_name: a.patient_last_name,
                    email: a.patient_email,
                },
                provider: {
                    first_name: a.provider_first_name,
                    last_name: a.provider_last_name,
                },
            }));
            setAppointments(normalized);

        } catch (error) {
            console.error("Error fetching appointments:", error);
            toast.error("Failed to load appointments");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'default';
            case 'cancelled': return 'destructive';
            case 'scheduled': return 'secondary';
            default: return 'outline';
        }
    };

    if (instLoading) {
      return <div className="min-h-screen bg-canvas flex items-center justify-center p-6"><div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" aria-hidden /><span className="sr-only">Loading institution</span></div>;
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (!institution) {
      return <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-center"><p className="text-sm text-graphite-500">No institution linked to your account. Contact support.</p></div>;
    }

    return (
        <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
          <div className="doc-page-header px-4 sm:px-6 py-5 shadow-sm">
            <div className="max-w-content mx-auto flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button"><Calendar className="h-5 w-5" /></div>
              <div>
                <h1 className="font-display text-2xl font-medium tracking-tight">Appointments</h1>
                <p className="text-sm text-graphite-500 font-medium tracking-wide">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} · institutional scope</p>
              </div>
            </div>
          </div>
          <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
            <div className="vf-card !p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-canvas-silk flex items-center justify-between">
                <h2 className="font-medium text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /> All Appointments ({appointments.length})</h2>
              </div>
              <div className="p-5">
                    {appointments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No appointments found for this institution.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appointments.map((appt) => (
                                    <TableRow key={appt.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(new Date(appt.date), 'MMM d, yyyy')}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {appt.time}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {appt.patient?.first_name} {appt.patient?.last_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{appt.patient?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {[appt.provider?.first_name, appt.provider?.last_name].filter(Boolean).join(' ') || 'Provider'}
                                        </TableCell>
                                        <TableCell>{appt.type}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(appt.status) as any}>
                                                {appt.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
              </div>
            </div>
        </div>
    </div>
    );
};

export default InstitutionAppointments;
