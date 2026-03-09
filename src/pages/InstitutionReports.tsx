import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Users, Calendar, UserCheck, Loader2, DollarSign, Bed, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, PieChart, Pie, Cell } from "recharts";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const InstitutionReports = () => {
  const { institution, loading: instLoading } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ patients: 0, appointments: 0, personnel: 0, revenue: 0, beds: 0, occupiedBeds: 0 });
  const [appointmentChart, setAppointmentChart] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (!institution) { setLoading(false); return; }
    fetchStats();
  }, [institution]);

  const fetchStats = async () => {
    if (!institution) return;
    try {
      const instId = institution.id;

      const [personnelRes, bedsRes, invoicesRes, admissionsRes] = await Promise.all([
        supabase.from('institution_personnel').select('user_id', { count: 'exact' }).eq('institution_id', instId),
        supabase.from('hospital_beds' as any).select('status').eq('hospital_id', instId),
        supabase.from('billing_invoices').select('total_amount, status, created_at').eq('institution_id', instId),
        supabase.from('hospital_admissions').select('status, admission_date').eq('hospital_id', instId),
      ]);

      const providerIds = personnelRes.data?.map(p => p.user_id) || [];
      const beds = bedsRes.data || [];
      const invoices = invoicesRes.data || [];
      const admissions = admissionsRes.data || [];

      let appointmentsCount = 0;
      let patientsCount = 0;
      const months: Record<string, { appts: number; revenue: number }> = {};

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months[format(d, 'MMM')] = { appts: 0, revenue: 0 };
      }

      if (providerIds.length > 0) {
        const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).in('provider_id', providerIds);
        appointmentsCount = count || 0;

        const { data: appts } = await supabase.from('appointments').select('patient_id, date, status').in('provider_id', providerIds);
        patientsCount = new Set(appts?.map(a => a.patient_id)).size;

        appts?.forEach(a => {
          const key = format(new Date(a.date), 'MMM');
          if (months[key]) months[key].appts++;
        });
      }

      // Revenue by month
      invoices.forEach((inv: any) => {
        const key = format(new Date(inv.created_at), 'MMM');
        if (months[key]) months[key].revenue += inv.total_amount || 0;
      });

      const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

      // Status distribution for pie chart
      const statusCounts: Record<string, number> = {};
      admissions.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

      setStats({
        patients: patientsCount,
        appointments: appointmentsCount,
        personnel: personnelRes.count || 0,
        revenue: totalRevenue,
        beds: beds.length,
        occupiedBeds: beds.filter((b: any) => b.status === 'occupied').length,
      });

      setAppointmentChart(Object.entries(months).map(([name, v]) => ({ name, total: v.appts })));
      setRevenueChart(Object.entries(months).map(([name, v]) => ({ name, revenue: v.revenue })));
      setStatusDistribution(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (instLoading || loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const currency = institution?.currency || 'ZMW';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reports & Analytics</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { title: 'Patients', value: stats.patients, icon: Users, sub: 'Unique patients' },
          { title: 'Appointments', value: stats.appointments, icon: Calendar, sub: 'All time' },
          { title: 'Personnel', value: stats.personnel, icon: UserCheck, sub: 'Active staff' },
          { title: 'Revenue', value: `${currency} ${stats.revenue.toLocaleString()}`, icon: DollarSign, sub: 'Total collected' },
          { title: 'Total Beds', value: stats.beds, icon: Bed, sub: `${stats.occupiedBeds} occupied` },
          { title: 'Occupancy', value: stats.beds > 0 ? `${Math.round((stats.occupiedBeds / stats.beds) * 100)}%` : 'N/A', icon: TrendingUp, sub: 'Bed utilization' },
        ].map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium">{s.title}</CardTitle>
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg font-bold">{s.value}</div>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" />
                Appointments (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentChart}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChart}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admissions">
          <Card>
            <CardHeader>
              <CardTitle>Admission Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                {statusDistribution.length === 0 ? (
                  <p className="text-muted-foreground">No admission data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {statusDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstitutionReports;
