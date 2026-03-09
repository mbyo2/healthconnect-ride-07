import React from 'react';
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

// Sample data for demo - in production this would come from the database
const sampleMetrics = {
  total_revenue: 1250000,
  total_expenses: 980000,
  net_income: 270000,
  collection_rate: 92.5,
  total_patients: 1240,
  new_patients: 156,
  total_appointments: 890,
  completed_appointments: 812,
  cancelled_appointments: 45,
  no_show_rate: 3.7,
  bed_occupancy_rate: 78.5,
  icu_occupancy_rate: 85.2,
  er_visits: 234,
  average_er_wait_time: 28,
  lab_tests_completed: 567,
  average_lab_tat: 45,
  total_admissions: 89,
  total_discharges: 82,
  average_length_of_stay: 4.2,
  prescriptions_filled: 1456,
  medication_errors: 2,
  total_staff: 245,
  staff_present: 228,
  staff_on_leave: 17,
  patient_satisfaction_score: 0.87,
  readmission_rate: 4.2,
  infection_rate: 0.8,
  mortality_rate: 1.2,
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#00C49F', '#FFBB28', '#FF8042'];

export const CXOExecutiveDashboard: React.FC<CXODashboardProps> = ({ institutionId }) => {
  const latestMetrics = sampleMetrics;

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

  // Sample chart data
  const revenueData = Array.from({ length: 14 }, (_, i) => ({
    date: `Day ${i + 1}`,
    revenue: 80000 + Math.random() * 40000,
    expenses: 60000 + Math.random() * 30000,
    netIncome: 20000 + Math.random() * 15000,
  }));

  const patientData = Array.from({ length: 14 }, (_, i) => ({
    date: `Day ${i + 1}`,
    total: 80 + Math.floor(Math.random() * 40),
    new: 10 + Math.floor(Math.random() * 15),
  }));

  const occupancyData = [
    { name: 'General Beds', value: latestMetrics.bed_occupancy_rate },
    { name: 'ICU', value: latestMetrics.icu_occupancy_rate },
    { name: 'Available', value: 100 - latestMetrics.bed_occupancy_rate },
  ];

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
              title="Total Revenue"
              value={latestMetrics.total_revenue}
              trend={5.2}
              icon={DollarSign}
              format={formatCurrency}
            />
            <MetricCard
              title="Total Expenses"
              value={latestMetrics.total_expenses}
              trend={2.1}
              icon={DollarSign}
              format={formatCurrency}
              invertTrend
            />
            <MetricCard
              title="Net Income"
              value={latestMetrics.net_income}
              trend={8.5}
              icon={TrendingUp}
              format={formatCurrency}
            />
            <MetricCard
              title="Collection Rate"
              value={latestMetrics.collection_rate}
              trend={1.2}
              icon={DollarSign}
              format={(v) => `${v?.toFixed(1) || 0}%`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses (14-Day Trend)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="netIncome" stroke="hsl(var(--accent))" strokeWidth={2} name="Net Income" />
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
              trend={3.5}
              icon={Users}
            />
            <MetricCard
              title="Appointments"
              value={latestMetrics.total_appointments}
              trend={2.8}
              icon={Calendar}
            />
            <MetricCard
              title="Bed Occupancy"
              value={latestMetrics.bed_occupancy_rate}
              trend={1.5}
              icon={Bed}
              format={(v) => `${v?.toFixed(1) || 0}%`}
            />
            <MetricCard
              title="No-Show Rate"
              value={latestMetrics.no_show_rate}
              trend={-0.5}
              icon={AlertTriangle}
              format={(v) => `${v?.toFixed(1) || 0}%`}
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
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Total Patients" />
                    <Bar dataKey="new" fill="hsl(var(--accent))" name="New Patients" />
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
              trend={4.2}
              icon={Activity}
            />
            <MetricCard
              title="Avg ER Wait Time"
              value={latestMetrics.average_er_wait_time}
              trend={-2.1}
              icon={Clock}
              format={(v) => `${v || 0} min`}
              invertTrend
            />
            <MetricCard
              title="Lab Tests"
              value={latestMetrics.lab_tests_completed}
              trend={6.3}
              icon={FlaskConical}
            />
            <MetricCard
              title="Avg Lab TAT"
              value={latestMetrics.average_lab_tat}
              trend={-3.5}
              icon={Clock}
              format={(v) => `${v || 0} min`}
              invertTrend
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
                  <span>Avg Length of Stay</span>
                  <span className="font-bold">{latestMetrics.average_length_of_stay.toFixed(1)} days</span>
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
                  <span>Prescriptions Filled</span>
                  <span className="font-bold">{latestMetrics.prescriptions_filled}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medication Errors</span>
                  <Badge variant={latestMetrics.medication_errors ? 'destructive' : 'secondary'}>
                    {latestMetrics.medication_errors}
                  </Badge>
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
                  <span>Present Today</span>
                  <span className="font-bold">{latestMetrics.staff_present}</span>
                </div>
                <div className="flex justify-between">
                  <span>On Leave</span>
                  <span className="font-bold">{latestMetrics.staff_on_leave}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Patient Satisfaction"
              value={latestMetrics.patient_satisfaction_score}
              trend={2.1}
              icon={Heart}
              format={(v) => `${((v || 0) * 100).toFixed(0)}%`}
            />
            <MetricCard
              title="Readmission Rate"
              value={latestMetrics.readmission_rate}
              trend={-0.8}
              icon={Activity}
              format={(v) => `${v?.toFixed(1) || 0}%`}
              invertTrend
            />
            <MetricCard
              title="Infection Rate"
              value={latestMetrics.infection_rate}
              trend={-0.2}
              icon={AlertTriangle}
              format={(v) => `${v?.toFixed(2) || 0}%`}
              invertTrend
            />
            <MetricCard
              title="Mortality Rate"
              value={latestMetrics.mortality_rate}
              trend={-0.1}
              icon={AlertTriangle}
              format={(v) => `${v?.toFixed(2) || 0}%`}
              invertTrend
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics Overview</CardTitle>
              <CardDescription>Key performance indicators for clinical quality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Patient Satisfaction Target (90%)</span>
                  <span>{(latestMetrics.patient_satisfaction_score * 100).toFixed(0)}%</span>
                </div>
                <Progress value={latestMetrics.patient_satisfaction_score * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Collection Rate Target (95%)</span>
                  <span>{latestMetrics.collection_rate.toFixed(1)}%</span>
                </div>
                <Progress value={latestMetrics.collection_rate} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Bed Occupancy Target (85%)</span>
                  <span>{latestMetrics.bed_occupancy_rate.toFixed(1)}%</span>
                </div>
                <Progress value={latestMetrics.bed_occupancy_rate} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CXOExecutiveDashboard;
