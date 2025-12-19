
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Calendar, Activity, Settings, FileText } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

export const InstitutionDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [institution, setInstitution] = useState<any>(null);
    const [counts, setCounts] = useState({
        personnel: 0,
        appointments: 0,
        patients: 0,
        reports: 0
    });

    useEffect(() => {
        const fetchInstitutionAndCounts = async () => {
            if (!user) return;

            try {
                // 1. Fetch Institution
                const { data: inst, error: instError } = await supabase
                    .from('healthcare_institutions')
                    .select('*')
                    .eq('admin_id', user.id)
                    .maybeSingle();

                if (instError) throw instError;

                if (!inst) {
                    setInstitution(null);
                    setLoading(false);
                    return;
                }

                setInstitution(inst);

                // 2. Fetch Counts
                // Personnel Count
                const { count: personnelCount } = await supabase
                    .from('institution_personnel')
                    .select('*', { count: 'exact', head: true })
                    .eq('institution_id', inst.id);

                // Get Personnel IDs for subsequent queries
                const { data: personnelData } = await supabase
                    .from('institution_personnel')
                    .select('user_id')
                    .eq('institution_id', inst.id);

                const providerIds = personnelData?.map(p => p.user_id) || [];

                // Appointment Count
                let appointmentCount = 0;
                if (providerIds.length > 0) {
                    const { count: apptCount } = await supabase
                        .from('appointments')
                        .select('*', { count: 'exact', head: true })
                        .in('provider_id', providerIds);
                    appointmentCount = apptCount || 0;
                }

                // Patient Count (Unique patients from admissions and appointments)
                const { data: admissions } = await supabase
                    .from('hospital_admissions')
                    .select('patient_id')
                    .eq('hospital_id', inst.id);

                let patientAppts: any[] = [];
                if (providerIds.length > 0) {
                    const { data: appts } = await supabase
                        .from('appointments')
                        .select('patient_id')
                        .in('provider_id', providerIds);
                    patientAppts = appts || [];
                }

                const uniquePatientIds = new Set([
                    ...(admissions?.map(a => a.patient_id) || []),
                    ...(patientAppts.map(a => a.patient_id) || [])
                ]);

                // Report Count (Audit logs)
                const { count: reportCount } = await supabase
                    .from('audit_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('institution_id', inst.id);

                setCounts({
                    personnel: personnelCount || 0,
                    appointments: appointmentCount,
                    patients: uniquePatientIds.size,
                    reports: reportCount || 0
                });

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                // Don't navigate away immediately, let the UI handle the null institution state
            } finally {
                setLoading(false);
            }
        };

        fetchInstitutionAndCounts();
    }, [user, navigate]);

    if (loading) return <LoadingScreen />;

    if (!institution) {
        return (
            <div className="container mx-auto p-6 text-center space-y-4">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-2xl font-bold">Institution Not Found</h2>
                <p className="text-muted-foreground">
                    We couldn't find an institution associated with your account.
                    If you haven't registered yet, please visit the portal.
                </p>
                <Button onClick={() => navigate("/institution-portal")}>
                    Go to Institution Portal
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-primary" />
                        {institution.name}
                    </h1>
                    <p className="text-muted-foreground capitalize">{institution.type} Dashboard</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/institution/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/personnel")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Personnel</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.personnel}</div>
                        <p className="text-xs text-muted-foreground">Manage staff and roles</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/appointments")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.appointments}</div>
                        <p className="text-xs text-muted-foreground">View and schedule</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/patients")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Patients</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.patients}</div>
                        <p className="text-xs text-muted-foreground">Patient records</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/reports")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Reports</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.reports}</div>
                        <p className="text-xs text-muted-foreground">Analytics and logs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add more sections as needed */}
        </div>
    );
};

export default InstitutionDashboard;
