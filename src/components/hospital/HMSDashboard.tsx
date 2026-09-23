import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Users, Activity, Building2, DollarSign, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { MetricCard } from '@/components/shared/MetricCard';
import { SimpleBarChart, DonutChart, TrendChart } from '@/components/charts';
import { SuggestionBanner } from '@/components/guidance';
import { useNavigate } from 'react-router-dom';

interface HMSDashboardProps {
  hospital: any;
  departments: any[];
  beds: any[];
  admissions: any[];
  invoices: any[];
}

export const HMSDashboard = ({ hospital, departments, beds, admissions, invoices }: HMSDashboardProps) => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  
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

  // Real per-department bed counts (beds carry their department join).
  const bedsByDepartment = (departments || []).slice(0, 6).map((dept: any) => {
    const deptBeds = (beds || []).filter((b: any) => (b.department?.name || b.department_id) === (dept.name || dept.id));
    return {
      name: String(dept.name || 'Ward').substring(0, 12),
      occupied: deptBeds.filter((b: any) => b.status === 'occupied').length,
      available: deptBeds.filter((b: any) => b.status === 'available').length,
    };
  });

  // Real admission mix by department.
  const admissionsByDepartment = (() => {
    const groups = new Map<string, number>();
    (admissions || []).forEach((a: any) => {
      const key = a.department?.name || 'General';
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    const palette = ['#397dff', '#EF4444', '#22C55E', '#f55c15', '#a25ddc', '#eab308'];
    const entries = [...groups.entries()].slice(0, 6);
    if (entries.length === 0) return [{ name: 'No admissions yet', value: 0, color: '#cbd5e1' }];
    return entries.map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  })();

  // Real last-7-days admissions vs discharges.
  const weeklyFlow = (() => {
    const days: { name: string; key: string }[] = [];
    const fmt = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ name: fmt[d.getDay()], key: d.toDateString() });
    }
    return days.map(({ name, key }) => ({
      name,
      admissions: (admissions || []).filter((a: any) => a.admission_date && new Date(a.admission_date).toDateString() === key).length,
      discharges: (admissions || []).filter((a: any) => a.discharge_date && new Date(a.discharge_date).toDateString() === key).length,
    }));
  })();

  // Real billing mix by payment status.
  const billingByStatus = (() => {
    const groups = new Map<string, number>();
    (invoices || []).forEach((inv: any) => {
      const key = (inv.payment_status || 'pending').toLowerCase();
      groups.set(key, (groups.get(key) || 0) + (Number(inv.total_amount) || 0));
    });
    const entries = [...groups.entries()];
    if (entries.length === 0) return [{ name: 'No invoices yet', revenue: 0 }];
    return entries.map(([name, revenue]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      revenue: Math.round(revenue),
    }));
  })();

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
            { label: 'View Bed Management', onClick: () => navigate('/hospital-management?tab=beds'), variant: 'primary' },
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
        />
        <MetricCard
          title="Inpatients"
          value={admissions?.length?.toString() || '0'}
          subtitle={`${todayAdmissions} admitted today`}
          icon={Users}
        />
        <MetricCard
          title="Revenue"
          value={formatPrice(totalRevenue)}
          subtitle={`${formatPrice(pendingAmount)} pending`}
          icon={DollarSign}
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
            data={bedsByDepartment}
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
            data={admissionsByDepartment}
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
            data={weeklyFlow}
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
              Billing by Status
            </h3>
            <p className="text-xs text-graphite-500 mt-1">Invoiced amounts grouped by payment status</p>
          </div>
          <SimpleBarChart
            data={billingByStatus}
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
