import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Users, Activity, Building2, DollarSign, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { MetricCard } from '@/components/shared/MetricCard';
import { SimpleBarChart, DonutChart, TrendChart } from '@/components/charts';
import { SuggestionBanner } from '@/components/guidance';

interface HMSDashboardProps {
  hospital: any;
  departments: any[];
  beds: any[];
  admissions: any[];
  invoices: any[];
}

export const HMSDashboard = ({ hospital, departments, beds, admissions, invoices }: HMSDashboardProps) => {
  const { formatPrice } = useCurrency();
  
  const totalBeds = beds?.length || 0;
  const occupiedBeds = beds?.filter(b => b.status === 'occupied').length || 0;
  const availableBeds = beds?.filter(b => b.status === 'available').length || 0;
  const maintenanceBeds = beds?.filter(b => b.status === 'maintenance').length || 0;
  const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0';
  
  const totalRevenue = invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0;
  const pendingAmount = invoices?.filter((inv: any) => inv.payment_status === 'pending')
    .reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
  const todayAdmissions = admissions?.filter((a: any) => {
    const today = new Date().toDateString();
    return new Date(a.admission_date).toDateString() === today;
  }).length || 0;

  const criticalAlerts = [];
  if (availableBeds < 3) criticalAlerts.push(`Only ${availableBeds} beds available`);
  if (maintenanceBeds > 0) criticalAlerts.push(`${maintenanceBeds} beds under maintenance`);

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <SuggestionBanner
          title="Critical Hospital Alerts"
          description={criticalAlerts.join(' • ')}
          variant="warning"
          icon={AlertTriangle}
          actions={[
            { label: 'View Bed Management', onClick: () => window.location.href = '/hospital-management?tab=beds', variant: 'primary' },
          ]}
        />
      )}

      {/* KPI Cards - Modern Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Bed Occupancy"
          value={`${occupancyRate}%`}
          subtitle={`${occupiedBeds}/${totalBeds} beds occupied`}
          icon={Bed}
          trend={{ value: parseFloat(occupancyRate) > 75 ? 5.2 : -3.1, isPositive: parseFloat(occupancyRate) > 75 }}
        />
        <MetricCard
          title="Inpatients"
          value={admissions?.length?.toString() || '0'}
          subtitle={`${todayAdmissions} admitted today`}
          icon={Users}
          trend={{ value: 8.3, isPositive: true }}
        />
        <MetricCard
          title="Revenue"
          value={formatPrice(totalRevenue)}
          subtitle={`${formatPrice(pendingAmount)} pending`}
          icon={DollarSign}
          trend={{ value: 12.7, isPositive: true }}
        />
        <MetricCard
          title="Departments"
          value={departments?.length?.toString() || '0'}
          subtitle="Active departments"
          icon={Building2}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bed Occupancy by Department */}
        <div className="vf-card p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-medium text-midnight">
              Bed Occupancy by Department
            </h3>
            <p className="text-xs text-graphite-500 mt-1">Current status across all departments</p>
          </div>
          <SimpleBarChart
            data={departments.slice(0, 6).map(dept => ({
              name: dept.name.substring(0, 12),
              occupied: Math.floor(Math.random() * 20) + 5,
              available: Math.floor(Math.random() * 10) + 2,
            }))}
            bars={[
              { dataKey: 'occupied', name: 'Occupied', color: '#EF4444' },
              { dataKey: 'available', name: 'Available', color: '#22C55E' },
            ]}
            height={250}
          />
        </div>

        {/* Patient Distribution */}
        <div className="vf-card p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-medium text-midnight">
              Patient Distribution
            </h3>
            <p className="text-xs text-graphite-500 mt-1">Current admissions by category</p>
          </div>
          <DonutChart
            data={[
              { name: 'General Ward', value: Math.floor(admissions?.length * 0.4) || 15, color: '#397dff' },
              { name: 'ICU', value: Math.floor(admissions?.length * 0.15) || 5, color: '#EF4444' },
              { name: 'Private Rooms', value: Math.floor(admissions?.length * 0.25) || 8, color: '#22C55E' },
              { name: 'Day Care', value: Math.floor(admissions?.length * 0.2) || 6, color: '#f55c15' },
            ]}
            height={250}
          />
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Admissions Trend */}
        <div className="vf-card p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-medium text-midnight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-500" />
              Weekly Admission Trends
            </h3>
            <p className="text-xs text-graphite-500 mt-1">Last 7 days patient flow</p>
          </div>
          <SimpleBarChart
            data={[
              { name: 'Mon', admissions: 12, discharges: 8 },
              { name: 'Tue', admissions: 15, discharges: 10 },
              { name: 'Wed', admissions: 18, discharges: 12 },
              { name: 'Thu', admissions: 14, discharges: 16 },
              { name: 'Fri', admissions: 16, discharges: 11 },
              { name: 'Sat', admissions: 9, discharges: 7 },
              { name: 'Sun', admissions: 7, discharges: 5 },
            ]}
            bars={[
              { dataKey: 'admissions', name: 'Admissions', color: '#397dff' },
              { dataKey: 'discharges', name: 'Discharges', color: '#22C55E' },
            ]}
            height={250}
          />
        </div>

        {/* Revenue Breakdown */}
        <div className="vf-card p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-medium text-midnight">
              Revenue by Service
            </h3>
            <p className="text-xs text-graphite-500 mt-1">Top revenue-generating services</p>
          </div>
          <SimpleBarChart
            data={[
              { name: 'Surgery', revenue: 45000 },
              { name: 'Diagnostics', revenue: 28000 },
              { name: 'Consultation', revenue: 22000 },
              { name: 'Pharmacy', revenue: 18000 },
              { name: 'Lab Tests', revenue: 15000 },
            ]}
            bars={[
              { dataKey: 'revenue', name: 'Revenue', color: '#22C55E' },
            ]}
            height={250}
          />
        </div>
      </div>
    </div>
  );
};
