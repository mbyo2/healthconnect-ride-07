import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Users, Activity, Building2, DollarSign, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

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
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">Alerts</span>
            </div>
            {criticalAlerts.map((alert, i) => (
              <p key={i} className="text-sm text-destructive/80">• {alert}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Bed className="h-4 w-4 text-primary" /> Bed Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">{occupiedBeds}/{totalBeds} occupied</p>
            <div className="flex gap-1 mt-2">
              <Badge variant="default" className="text-[10px]">{availableBeds} Free</Badge>
              {maintenanceBeds > 0 && <Badge variant="outline" className="text-[10px]">{maintenanceBeds} Maint.</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Inpatients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admissions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">{todayAdmissions} admitted today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{formatPrice(pendingAmount)} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {departments && departments.length > 0 ? (
              <div className="space-y-3">
                {departments.slice(0, 6).map((dept: any) => {
                  const deptBeds = beds?.filter((b: any) => b.department_id === dept.id) || [];
                  const deptOccupied = deptBeds.filter((b: any) => b.status === 'occupied').length;
                  return (
                    <div key={dept.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                      <div>
                        <p className="font-medium text-sm">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">Code: {dept.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{deptOccupied}/{deptBeds.length}</p>
                        <p className="text-xs text-muted-foreground">beds</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No departments configured</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            {admissions && admissions.length > 0 ? (
              <div className="space-y-3">
                {admissions.slice(0, 6).map((admission: any) => (
                  <div key={admission.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                    <div>
                      <p className="font-medium text-sm">
                        {admission.patient?.first_name} {admission.patient?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{admission.department?.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{admission.admission_type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No active admissions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
