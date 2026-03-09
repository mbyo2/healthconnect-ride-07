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
    { label: 'Admit Patient', icon: Bed, route: '/hospital-management', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Add Staff', icon: UserPlus, route: '/institution/personnel', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'New Appointment', icon: Calendar, route: '/institution/appointments', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { label: 'OPD Queue', icon: Stethoscope, route: '/hospital-management', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'Create Invoice', icon: DollarSign, route: '/hospital-management', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { label: 'Schedule OT', icon: Scissors, route: '/hospital-management', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { label: 'Discharge', icon: ClipboardList, route: '/hospital-management', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    { label: 'View Reports', icon: BarChart3, route: '/institution/reports', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
    { label: 'Inventory', icon: Package, route: '/pharmacy-inventory', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    { label: 'IoT Devices', icon: Wifi, route: '/institution/devices', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
    { label: 'Patient Records', icon: FileText, route: '/institution/patients', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    { label: 'Settings', icon: Settings, route: '/institution/settings', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
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
              <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
