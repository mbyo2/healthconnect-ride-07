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
  // Anatomy (sweep 2026-11-11): stat icons take ONE muted treatment —
  // no rainbow icon colours; the revenue (money-in) icon is the single
  // green accent, matching the money-colour rule. Numerals stay ink.
  const stats = [
    { title: 'Total Personnel', value: personnel, icon: Users, subtitle: 'Active staff members', color: 'text-muted-foreground' },
    { title: "Today's Appointments", value: todayAppointments, icon: Calendar, subtitle: `${appointments} total all-time`, color: 'text-muted-foreground' },
    { title: 'Active Patients', value: patients, icon: Activity, subtitle: 'Unique patients seen', color: 'text-muted-foreground' },
    { title: 'Revenue (MTD)', value: `${currency} ${revenue.toLocaleString()}`, icon: DollarSign, subtitle: 'Month to date', color: 'text-success-600' },
    { title: 'Bed Occupancy', value: `${bedOccupancy}%`, icon: Bed, subtitle: 'Current utilization', color: 'text-muted-foreground' },
    { title: 'Growth', value: '+12%', icon: TrendingUp, subtitle: 'vs last month', color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground truncate">{stat.title}</CardTitle>
            <stat.icon className={`h-3.5 w-3.5 ${stat.color} shrink-0`} />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground truncate">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
