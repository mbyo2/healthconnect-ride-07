import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Users, Calendar, UserCheck, Loader2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const InstitutionReports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        patients: 0,
        appointments: 0,
        personnel: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
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

            // 2. Personnel Count
            const { count: personnelCount } = await supabase
                .from('institution_personnel')
                .select('*', { count: 'exact', head: true })
                .eq('institution_id', inst.id);

            // 3. Appointments & Patients & Chart Data
            const { data: personnel } = await supabase
                .from('institution_personnel')
                .select('user_id')
                .eq('institution_id', inst.id);

            const providerIds = personnel?.map(p => p.user_id) || [];

            let appointmentsCount = 0;
            let patientsCount = 0;
            const months: { [key: string]: number } = {};

            // Initialize last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toLocaleString('default', { month: 'short' });
                months[key] = 0;
            }

            if (providerIds.length > 0) {
                const { count } = await supabase
                    .from('appointments')
                    .select('*', { count: 'exact', head: true })
                    .in('provider_id', providerIds);
                appointmentsCount = count || 0;

                // Unique patients from appointments
                const { data: appts } = await supabase
                    .from('appointments')
                    .select('patient_id, date')
                    .in('provider_id', providerIds);

                const uniquePatients = new Set(appts?.map(a => a.patient_id));
                patientsCount = uniquePatients.size;

                // Chart Data Aggregation
                appts?.forEach(a => {
                    const d = new Date(a.date);
                    const key = d.toLocaleString('default', { month: 'short' });
                    if (months[key] !== undefined) {
                        months[key]++;
                    }
                });
            }

            setStats({
                patients: patientsCount,
                appointments: appointmentsCount,
                personnel: personnelCount || 0
            });

            const data = Object.keys(months).map(key => ({ name: key, total: months[key] }));
            setChartData(data);

        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.patients}</div>
                        <p className="text-xs text-muted-foreground">Unique patients seen</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.appointments}</div>
                        <p className="text-xs text-muted-foreground">All time appointments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.personnel}</div>
                        <p className="text-xs text-muted-foreground">Active staff members</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChartIcon className="h-6 w-6" />
                        Appointments Overview (Last 6 Months)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="currentColor"
                                    className="text-muted-foreground"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="currentColor"
                                    className="text-muted-foreground"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip />
                                <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default InstitutionReports;
