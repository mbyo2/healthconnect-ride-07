import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, Users, Calendar, Bed, Activity, FlaskConical,
  TrendingUp, TrendingDown, AlertTriangle, Clock, Heart,
  Building2, Pill, Stethoscope
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CXODashboardProps {
  institutionId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#00C49F', '#FFBB28', '#FF8042'];

const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const dayKey = (d: Date) => d.toISOString().split('T')[0];

export const CXOExecutiveDashboard: React.FC<CXODashboardProps> = ({ institutionId }) => {
  // Every metric below is computed from this institution's own tables.
  // Anything without a data source renders neutral ("—"), never invented.
  const { data: src } = useQuery({
    queryKey: ['cxo-metrics', institutionId],
    queryFn: async () => {
      const [bedsRes, admRes, billRes, personnelRes, staffRes, deptRes, labRes, pharmRes] = await Promise.all([
        supabase.from('hospital_beds' as any).select('id, status').eq('hospital_id', institutionId),
        supabase.from('hospital_admissions' as any).select('id, patient_id, status, admission_type, admission_date, discharge_date').eq('hospital_id', institutionId).order('admission_date', { ascending: false }).limit(2000),
        supabase.from('hospital_billing' as any).select('total_amount, paid_amount, payment_status, created_at').eq('hospital_id', institutionId).order('created_at', { ascending: false }).limit(2000),
        supabase.from('institution_personnel').select('user_id').eq('institution_id', institutionId),
        supabase.from('institution_staff').select('provider_id').eq('institution_id', institutionId).eq('is_active', true),
        supabase.from('hospital_departments' as any).select('id').eq('hospital_id', institutionId),
        (supabase as any).from('lab_tests').select('id', { count: 'exact', head: true }).eq('lab_id', institutionId),
        (supabase as any).from('pharmacy_sales').select('id', { count: 'exact', head: true }).eq('pharmacy_id', institutionId),
      ]);
      const providerIds = [...new Set([
        ...((personnelRes.data || []).map((p: any) => p.user_id)),
        ...((staffRes.data || []).map((s: any) => s.provider_id)),
      ].filter(Boolean))];
      let appointments: any[] = [];
      if (providerIds.length > 0) {
        const { data } = await supabase
          .from('appointments')
          .select('id, patient_id, status, date')
          .in('provider_id', providerIds)
          .limit(2000);
        appointments = data || [];
      }
      return {
        beds: (bedsRes.data || []) as any[],
        admissions: (admRes.data || []) as any[],
        bills: (billRes.data || []) as any[],
        appointments,
        staffCount: (personnelRes.data?.length || 0) + (staffRes.data?.length || 0),
        departmentCount: (deptRes.data?.length || 0),
        labCount: labRes.count ?? 0,
        pharmCount: pharmRes.count ?? 0,
      };
    },
    enabled: !!institutionId,
  });

  const latestMetrics = useMemo(() => {
    const beds = src?.beds || [];
    const admissions = src?.admissions || [];
    const bills = src?.bills || [];
    const appointments = src?.appointments || [];

    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const available = beds.filter((b) => b.status === 'available').length;
    const maintenance = beds.filter((b) => b.status === 'maintenance' || b.status === 'reserved').length;

    const billed = bills.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
    const collected = bills.reduce((s, b) => s + (Number(b.paid_amount) || 0), 0);

    const discharged = admissions.filter((a) => a.status === 'discharged');
    const stays = discharged
      .map((a) => {
        const st = new Date(a.admission_date).getTime();
        const en = a.discharge_date ? new Date(a.discharge_date).getTime() : NaN;
        return Number.isFinite(st) && Number.isFinite(en) ? (en - st) / 86400000 : null;
      })
      .filter((v): v is number => v !== null && v >= 0);

    const patientIds = new Set<string>([
      ...admissions.map((a) => a.patient_id).filter(Boolean),
      ...appointments.map((a) => a.patient_id).filter(Boolean),
    ]);
    const cutoff = Date.now() - 14 * 86400000;
    const newIds = new Set<string>([
      ...admissions.filter((a) => new Date(a.admission_date).getTime() >= cutoff).map((a) => a.patient_id),
      ...appointments.filter((a) => new Date(a.date).getTime() >= cutoff).map((a) => a.patient_id),
    ].filter(Boolean));

    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

    return {
      total_revenue: billed,
      collected_revenue: collected,
      outstanding: Math.max(billed - collected, 0),
      collection_rate: billed > 0 ? (collected / billed) * 100 : null as number | null,
      total_patients: patientIds.size,
      new_patients: newIds.size,
      total_appointments: appointments.length,
      completed_appointments: appointments.filter((a) => a.status === 'completed').length,
      cancelled_appointments: cancelled,
      cancellation_rate: appointments.length > 0 ? (cancelled / appointments.length) * 100 : null as number | null,
      bed_occupancy_rate: beds.length > 0 ? (occupied / beds.length) * 100 : null as number | null,
      total_beds: beds.length,
      er_visits: admissions.filter((a) => (a.admission_type || '').toLowerCase() === 'emergency').length,
      lab_tests_completed: src?.labCount || 0,
      total_admissions: admissions.length,
      total_discharges: discharged.length,
      average_length_of_stay: stays.length > 0 ? stays.reduce((s, v) => s + v, 0) / stays.length : null as number | null,
      pharmacy_sales: src?.pharmCount || 0,
      total_staff: src?.staffCount || 0,
      department_count: src?.departmentCount || 0,
    };
  }, [src]);

  const { revenueData, patientData, occupancyData } = useMemo(() => {
    const days: { date: string; key: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ date: dayLabel(d), key: dayKey(d) });
    }
    const revenueData = days.map(({ date, key }) => {
      const dayBills = (src?.bills || []).filter((b: any) => (b.created_at || '').split('T')[0] === key);
      return {
        date,
        revenue: dayBills.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0),
        collected: dayBills.reduce((s: number, b: any) => s + (Number(b.paid_amount) || 0), 0),
      };
    });
    const patientData = days.map(({ date, key }) => ({
      date,
      total: (src?.admissions || []).filter((a: any) => (a.admission_date || '').split('T')[0] === key).length,
      new: (src?.admissions || []).filter((a: any) => (a.discharge_date || '').split('T')[0] === key).length,
    }));
    const beds = src?.beds || [];
    const occupancyData = [
      { name: 'Occupied', value: beds.filter((b: any) => b.status === 'occupied').length },
      { name: 'Available', value: beds.filter((b: any) => b.status === 'available').length },
      { name: 'Maintenance', value: beds.filter((b: any) => !['occupied', 'available'].includes(b.status)).length },
    ];
    return { revenueData, patientData, occupancyData };
  }, [src]);

  const formatCurrency = (value: number | null) => {
    if (!value) return 'K0';
    return `K${value.toLocaleString()}`;
  };

  const MetricCard = ({ 
    title, 
    value, 
    trend = 0,
    icon: Icon, 
    format: formatFn = (v: number | null) => v?.toString() || '0',
    invertTrend = false 
  }: { 
    title: string; 
    value: number | null; 
    trend?: number;
    icon: React.ElementType; 
    format?: (v: number | null) => string;
    invertTrend?: boolean;
  }) => {
    const isPositive = invertTrend ? trend < 0 : trend > 0;

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{formatFn(value)}</p>
              {trend !== 0 && (
                <div className={`flex items-center text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time institutional performance metrics
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Building2 className="h-4 w-4 mr-2" />
          Institution Overview
        </Badge>
      </div>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Billed"
              value={latestMetrics.total_revenue}
              icon={DollarSign}
              format={formatCurrency}
            />
            <MetricCard
              title="Collected"
              value={latestMetrics.collected_revenue}
              icon={DollarSign}
              format={formatCurrency}
            />
            <MetricCard
              title="Outstanding"
              value={latestMetrics.outstanding}
              icon={TrendingUp}
              format={formatCurrency}
            />
            <MetricCard
              title="Collection Rate"
              value={latestMetrics.collection_rate}
              icon={DollarSign}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Billed vs Collected (14-Day Trend)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Billed" />
                  <Line type="monotone" dataKey="collected" stroke="hsl(var(--accent))" strokeWidth={2} name="Collected" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Patients"
              value={latestMetrics.total_patients}
              icon={Users}
            />
            <MetricCard
              title="Appointments"
              value={latestMetrics.total_appointments}
              icon={Calendar}
            />
            <MetricCard
              title="Bed Occupancy"
              value={latestMetrics.bed_occupancy_rate}
              icon={Bed}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
            <MetricCard
              title="Cancellation Rate"
              value={latestMetrics.cancellation_rate}
              icon={AlertTriangle}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
              invertTrend
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Volume (14-Day Trend)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={patientData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Admissions" />
                    <Bar dataKey="new" fill="hsl(var(--accent))" name="Discharges" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bed Occupancy Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {occupancyData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="ER Visits"
              value={latestMetrics.er_visits}
              icon={Activity}
            />
            <MetricCard
              title="Avg Length of Stay"
              value={latestMetrics.average_length_of_stay}
              icon={Clock}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)} days`)}
            />
            <MetricCard
              title="Lab Tests"
              value={latestMetrics.lab_tests_completed}
              icon={FlaskConical}
            />
            <MetricCard
              title="Pharmacy Sales"
              value={latestMetrics.pharmacy_sales}
              icon={Pill}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Admissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Admissions</span>
                  <span className="font-bold">{latestMetrics.total_admissions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Discharges</span>
                  <span className="font-bold">{latestMetrics.total_discharges}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency Admissions</span>
                  <span className="font-bold">{latestMetrics.er_visits}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Pharmacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Sales Transactions</span>
                  <span className="font-bold">{latestMetrics.pharmacy_sales}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lab Tests Completed</span>
                  <span className="font-bold">{latestMetrics.lab_tests_completed}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Staff</span>
                  <span className="font-bold">{latestMetrics.total_staff}</span>
                </div>
                <div className="flex justify-between">
                  <span>Departments</span>
                  <span className="font-bold">{latestMetrics.department_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Patients</span>
                  <span className="font-bold">{latestMetrics.total_patients}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Discharge Rate"
              value={latestMetrics.total_admissions > 0 ? (latestMetrics.total_discharges / latestMetrics.total_admissions) * 100 : null}
              icon={Heart}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
            <MetricCard
              title="Cancellation Rate"
              value={latestMetrics.cancellation_rate}
              icon={Activity}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
              invertTrend
            />
            <MetricCard
              title="Collection Rate"
              value={latestMetrics.collection_rate}
              icon={AlertTriangle}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
            <MetricCard
              title="Bed Occupancy"
              value={latestMetrics.bed_occupancy_rate}
              icon={Bed}
              format={(v) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics Overview</CardTitle>
              <CardDescription>
                Operational quality computed live. Clinical indicators (satisfaction, infection,
                mortality) appear once patient feedback and surveillance modules are connected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Discharge Rate Target (90%)</span>
                  <span>
                    {latestMetrics.total_admissions > 0
                      ? `${(((latestMetrics.total_discharges / latestMetrics.total_admissions) * 100)).toFixed(0)}%`
                      : '—'}
                  </span>
                </div>
                <Progress
                  value={latestMetrics.total_admissions > 0 ? (latestMetrics.total_discharges / latestMetrics.total_admissions) * 100 : 0}
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Collection Rate Target (95%)</span>
                  <span>{latestMetrics.collection_rate == null ? '—' : `${latestMetrics.collection_rate.toFixed(1)}%`}</span>
                </div>
                <Progress value={latestMetrics.collection_rate ?? 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Bed Occupancy Target (85%)</span>
                  <span>{latestMetrics.bed_occupancy_rate == null ? '—' : `${latestMetrics.bed_occupancy_rate.toFixed(1)}%`}</span>
                </div>
                <Progress value={latestMetrics.bed_occupancy_rate ?? 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CXOExecutiveDashboard;
