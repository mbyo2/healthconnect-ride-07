import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Activity, DollarSign, Bed, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  personnel: number;
  appointments: number;
  patients: number;
  revenue: number;
  bedOccupancy: number;
  todayAppointments: number;
  currency?: string;
}

export const InstitutionStatsCards = ({
  personnel, appointments, patients, revenue, bedOccupancy, todayAppointments, currency = 'ZMW'
}: StatsCardsProps) => {
  const stats = [
    { title: 'Total Personnel', value: personnel, icon: Users, subtitle: 'Active staff members', color: 'text-blue-600 dark:text-blue-400' },
    { title: "Today's Appointments", value: todayAppointments, icon: Calendar, subtitle: `${appointments} total all-time`, color: 'text-emerald-600 dark:text-emerald-400' },
    { title: 'Active Patients', value: patients, icon: Activity, subtitle: 'Unique patients seen', color: 'text-purple-600 dark:text-purple-400' },
    { title: 'Revenue (MTD)', value: `${currency} ${revenue.toLocaleString()}`, icon: DollarSign, subtitle: 'Month to date', color: 'text-amber-600 dark:text-amber-400' },
    { title: 'Bed Occupancy', value: `${bedOccupancy}%`, icon: Bed, subtitle: 'Current utilization', color: 'text-rose-600 dark:text-rose-400' },
    { title: 'Growth', value: '+12%', icon: TrendingUp, subtitle: 'vs last month', color: 'text-teal-600 dark:text-teal-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground truncate">{stat.title}</CardTitle>
            <stat.icon className={`h-3.5 w-3.5 ${stat.color} shrink-0`} />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">{stat.value}</div>
            <p className="text-[10px] text-muted-foreground truncate">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
