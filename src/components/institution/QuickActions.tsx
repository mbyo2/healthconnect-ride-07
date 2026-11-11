import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Bed, Calendar, FileText, Stethoscope, Package,
  BarChart3, Settings, Wifi, DollarSign, Scissors, ClipboardList
} from 'lucide-react';

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    { label: 'Admit Patient', icon: Bed, route: '/hospital-management?tab=ipd', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Add Staff', icon: UserPlus, route: '/institution/personnel', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'New Appointment', icon: Calendar, route: '/institution/appointments', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'OPD Queue', icon: Stethoscope, route: '/hospital-management?tab=opd', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Create Invoice', icon: DollarSign, route: '/hospital-management?tab=billing', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Schedule OT', icon: Scissors, route: '/hospital-management?tab=ot', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Discharge', icon: ClipboardList, route: '/hospital-management?tab=discharge', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'View Reports', icon: BarChart3, route: '/hospital-management?tab=mis', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Inventory', icon: Package, route: '/hospital-management?tab=inventory', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'IoT Devices', icon: Wifi, route: '/institution/devices', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Patient Records', icon: FileText, route: '/institution/patients', color: 'bg-primary-500/10 text-primary-600' },
    { label: 'Settings', icon: Settings, route: '/institution/settings', color: 'bg-primary-500/10 text-primary-600' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className="flex flex-col items-center gap-1.5 h-auto py-3 px-2"
              onClick={() => navigate(action.route)}
            >
              <div className={`p-2 rounded-lg ${action.color}`}>
                <action.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
