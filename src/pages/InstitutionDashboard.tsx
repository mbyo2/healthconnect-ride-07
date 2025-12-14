
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

    useEffect(() => {
        const fetchInstitution = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('healthcare_institutions')
                    .select('*')
                    .eq('admin_id', user.id)
                    .single();

                if (error) throw error;
                setInstitution(data);
            } catch (error) {
                console.error("Error fetching institution:", error);
                // If not found or error, maybe redirect to portal
                navigate("/institution-portal");
            } finally {
                setLoading(false);
            }
        };

        fetchInstitution();
    }, [user, navigate]);

    if (loading) return <LoadingScreen />;

    if (!institution) return null;

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
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Manage staff and roles</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/appointments")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">View and schedule</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/patients")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Patients</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Patient records</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/institution/reports")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Reports</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Analytics and logs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add more sections as needed */}
        </div>
    );
};

export default InstitutionDashboard;
