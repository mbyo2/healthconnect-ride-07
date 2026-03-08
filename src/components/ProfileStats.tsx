import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileStatsProps {
  userId?: string;
}

interface Stats {
  appointments: number;
  providers: number;
  prescriptions: number;
  connections: number;
}

export const ProfileStats = ({ userId }: ProfileStatsProps) => {
  const [stats, setStats] = useState<Stats>({ appointments: 0, providers: 0, prescriptions: 0, connections: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;

      try {
        const { count: appointmentCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', userId);

        const { count: connectionsCount } = await supabase
          .from('user_connections')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', userId)
          .eq('status', 'approved');

        const { count: prescriptionsCount } = await supabase
          .from('comprehensive_prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', userId);

        const { data: appointmentProviders } = await supabase
          .from('appointments')
          .select('provider_id')
          .eq('patient_id', userId);

        const uniqueProviders = new Set(appointmentProviders?.map(a => a.provider_id) || []).size;

        setStats({
          appointments: appointmentCount || 0,
          providers: Math.max(uniqueProviders, connectionsCount || 0),
          prescriptions: prescriptionsCount || 0,
          connections: connectionsCount || 0
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const statItems = [
    { value: stats.appointments, label: "Appointments" },
    { value: stats.providers, label: "Providers" },
    { value: stats.prescriptions, label: "Prescriptions" },
    { value: stats.connections, label: "Connections" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-primary">{item.value}</div>
            <div className="text-sm text-muted-foreground">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
