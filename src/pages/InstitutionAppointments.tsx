import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const InstitutionAppointments = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);

    useEffect(() => {
        fetchAppointments();
    }, [user]);

    const fetchAppointments = async () => {
        if (!user) return;
        try {
            // 1. Get Institution
            const { data: inst, error: instError } = await supabase
                .from('healthcare_institutions')
                .select('id')
                .eq('admin_id', user.id)
                .single();

            if (instError) throw instError;
            if (!inst) return;

            // 2. Get Personnel
            const { data: personnel } = await supabase
                .from('institution_personnel')
                .select('user_id')
                .eq('institution_id', inst.id);

            const providerIds = personnel?.map(p => p.user_id) || [];

            if (providerIds.length === 0) {
                setAppointments([]);
                return;
            }

            // 3. Get Appointments with Patient and Provider details
            const { data: appts, error: apptsError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    patient:profiles!patient_id(first_name, last_name, email),
                    provider:profiles!provider_id(first_name, last_name)
                `)
                .in('provider_id', providerIds)
                .order('date', { ascending: false });

            if (apptsError) throw apptsError;
            setAppointments(appts || []);

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Appointments</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-6 w-6" />
                        All Appointments ({appointments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                                            Dr. {appt.provider?.first_name} {appt.provider?.last_name}
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
                </CardContent>
            </Card>
        </div>
    );
};

export default InstitutionAppointments;
