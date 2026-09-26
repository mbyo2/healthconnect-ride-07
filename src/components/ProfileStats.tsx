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
  const [loadError, setLoadError] = useState(false);

  const fetchStats = async () => {
    if (!userId) return;

    try {
      setLoadError(false);
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
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loadError) {
    return (
      <div className="rounded-lg border border-border p-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your stats.</p>
        <button
          onClick={fetchStats}
          className="text-xs font-bold text-primary underline underline-offset-2 min-h-[44px] px-4"
        >
          Try again
        </button>
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
