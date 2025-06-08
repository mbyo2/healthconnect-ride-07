
import { supabase } from "@/integrations/supabase/client";

export interface HealthStat {
  title: string;
  value: string;
  unit: string;
  status: string;
  trend: "up" | "down" | "stable";
  icon: string;
}

export interface HealthGoal {
  title: string;
  current: number;
  target: number;
  icon: string;
}

export interface UpcomingAppointment {
  date: string;
  time: string;
  provider: string;
  type: string;
}

export const getHealthStats = async (): Promise<HealthStat[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch latest health metrics from database
    const { data: metrics } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(10);

    // Transform database data to health stats format
    return metrics?.map(metric => ({
      title: metric.metric_type,
      value: metric.value.toString(),
      unit: metric.unit || '',
      status: "Normal",
      trend: "stable" as const,
      icon: getIconForMetricType(metric.metric_type)
    })) || [];
  } catch (error) {
    console.error('Error fetching health stats:', error);
    return [];
  }
};

export const getHealthGoals = async (): Promise<HealthGoal[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Since health_goals table doesn't exist, return mock data based on health metrics
    const { data: metrics } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(4);

    // Create goals based on existing metrics
    return metrics?.map(metric => ({
      title: `${metric.metric_type} Goal`,
      current: metric.value || 0,
      target: getTargetForMetricType(metric.metric_type),
      icon: getIconForGoalType(metric.metric_type)
    })) || [];
  } catch (error) {
    console.error('Error fetching health goals:', error);
    return [];
  }
};

export const getUpcomingAppointments = async (): Promise<UpcomingAppointment[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_provider_id_fkey(first_name, last_name)
      `)
      .eq('patient_id', user.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5);

    return appointments?.map(apt => ({
      date: new Date(apt.date).toLocaleDateString(),
      time: apt.time || 'TBD',
      provider: apt.profiles?.first_name && apt.profiles?.last_name 
        ? `${apt.profiles.first_name} ${apt.profiles.last_name}` 
        : 'Provider',
      type: apt.type || 'Consultation'
    })) || [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
};

const getIconForMetricType = (type: string): string => {
  const iconMap: Record<string, string> = {
    'blood_pressure': 'Heart',
    'heart_rate': 'Activity',
    'weight': 'Target',
    'sleep': 'Moon',
    'temperature': 'Thermometer'
  };
  return iconMap[type] || 'Activity';
};

const getIconForGoalType = (type: string): string => {
  const iconMap: Record<string, string> = {
    'steps': 'Footprints',
    'water': 'Droplets',
    'exercise': 'Activity',
    'nutrition': 'Apple',
    'blood_pressure': 'Heart',
    'heart_rate': 'Activity',
    'weight': 'Target',
    'sleep': 'Moon',
    'temperature': 'Thermometer'
  };
  return iconMap[type] || 'Target';
};

const getTargetForMetricType = (type: string): number => {
  const targetMap: Record<string, number> = {
    'steps': 10000,
    'water': 8,
    'exercise': 30,
    'weight': 70,
    'heart_rate': 80,
    'blood_pressure': 120,
    'sleep': 8,
    'temperature': 37
  };
  return targetMap[type] || 100;
};
