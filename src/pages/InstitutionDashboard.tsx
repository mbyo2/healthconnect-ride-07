import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, Settings, ExternalLink } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Badge } from "@/components/ui/badge";
import { InstitutionStatsCards } from "@/components/institution/InstitutionStatsCards";
import { RecentActivityFeed } from "@/components/institution/RecentActivityFeed";
import { QuickActions } from "@/components/institution/QuickActions";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export const InstitutionDashboard = () => {
  const navigate = useNavigate();
  const { institution, loading: instLoading, isAdmin } = useInstitutionContext();
  const [counts, setCounts] = useState({
    personnel: 0, appointments: 0, patients: 0,
    todayAppointments: 0, revenue: 0, bedOccupancy: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!institution) { setDataLoading(false); return; }

    const fetchDashboardData = async () => {
      try {
        const instId = institution.id;
        const today = format(new Date(), 'yyyy-MM-dd');

        // Parallel queries
        const [personnelRes, bedsRes, admissionsRes, invoicesRes] = await Promise.all([
          supabase.from('institution_personnel').select('user_id', { count: 'exact' }).eq('institution_id', instId),
          supabase.from('hospital_beds' as any).select('status').eq('hospital_id', instId),
          supabase.from('hospital_admissions').select('patient_id, admission_date, status, diagnosis, discharge_date').eq('hospital_id', instId),
          supabase.from('billing_invoices').select('total_amount, created_at').eq('institution_id', instId),
        ]);

        const providerIds = personnelRes.data?.map(p => p.user_id) || [];
        const personnelCount = personnelRes.count || 0;

        // Appointments
        let appointmentsCount = 0;
        let todayCount = 0;
        let appointmentActivities: any[] = [];
        if (providerIds.length > 0) {
          const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).in('provider_id', providerIds);
          appointmentsCount = count || 0;
          
          const { count: todayC } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).in('provider_id', providerIds).eq('date', today);
          todayCount = todayC || 0;

          // Recent appointments for activity feed
          const { data: recentAppts } = await supabase.from('appointments')
            .select('id, date, time, status, type, patient:profiles!patient_id(first_name, last_name)')
            .in('provider_id', providerIds)
            .order('created_at', { ascending: false })
            .limit(5);

          appointmentActivities = (recentAppts || []).map((a: any) => ({
            id: a.id,
            type: 'appointment' as const,
            title: `${a.patient?.first_name || ''} ${a.patient?.last_name || ''}`,
            description: `${a.type} - ${a.status}`,
            timestamp: `${a.date}T${a.time}`,
          }));
        }

        // Unique patients
        const admissions = admissionsRes.data || [];
        const uniquePatients = new Set(admissions.map(a => a.patient_id));

        // Bed occupancy
        const beds = bedsRes.data || [];
        const occupiedBeds = beds.filter((b: any) => b.status === 'occupied').length;
        const bedOccupancy = beds.length > 0 ? Math.round((occupiedBeds / beds.length) * 100) : 0;

        // Revenue MTD
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const invoices = invoicesRes.data || [];
        const revenueMTD = invoices
          .filter((i: any) => i.created_at >= monthStart)
          .reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);

        // Chart: last 6 months revenue
        const months: { name: string; revenue: number; appointments: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
          const mEnd = format(endOfMonth(d), 'yyyy-MM-dd');
          const mName = format(d, 'MMM');
          const mRevenue = invoices
            .filter((inv: any) => inv.created_at >= mStart && inv.created_at <= mEnd)
            .reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
          months.push({ name: mName, revenue: mRevenue, appointments: 0 });
        }
        setChartData(months);

        // Admission activities
        const admissionActivities = admissions
          .sort((a, b) => new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime())
          .slice(0, 5)
          .map(a => ({
            id: a.patient_id + a.admission_date,
            type: a.status === 'discharged' ? 'discharge' as const : 'admission' as const,
            title: a.diagnosis || 'Patient admission',
            description: `Status: ${a.status}`,
            timestamp: a.admission_date,
          }));

        setActivities([...appointmentActivities, ...admissionActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10));

        setCounts({
          personnel: personnelCount,
          appointments: appointmentsCount,
          patients: uniquePatients.size,
          todayAppointments: todayCount,
          revenue: revenueMTD,
          bedOccupancy,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [institution]);

  if (instLoading || dataLoading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="container mx-auto p-6 text-center space-y-4">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">Institution Not Found</h2>
        <p className="text-muted-foreground">
          Register your institution to access the dashboard.
        </p>
        <Button onClick={() => navigate("/institution-portal")}>Go to Institution Portal</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            {institution.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground capitalize">{institution.type} Dashboard</p>
            <Badge variant={institution.is_verified ? "default" : "secondary"} className="text-[10px]">
              {institution.is_verified ? 'Verified' : 'Pending Verification'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/hospital-management")}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Full HMS
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/institution/settings")}>
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <InstitutionStatsCards
        personnel={counts.personnel}
        appointments={counts.appointments}
        patients={counts.patients}
        revenue={counts.revenue}
        bedOccupancy={counts.bedOccupancy}
        todayAppointments={counts.todayAppointments}
        currency={institution.currency || 'ZMW'}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Revenue Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`${institution.currency || 'ZMW'} ${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <RecentActivityFeed activities={activities} />
      </div>
    </div>
  );
};

export default InstitutionDashboard;
