
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

    const { data: goals } = await supabase
      .from('health_goals')
      .select('*')
      .eq('user_id', user.id);

    return goals?.map(goal => ({
      title: goal.goal_type,
      current: goal.current_value || 0,
      target: goal.target_value || 0,
      icon: getIconForGoalType(goal.goal_type)
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
        profiles!appointments_provider_id_fkey(full_name)
      `)
      .eq('patient_id', user.id)
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(5);

    return appointments?.map(apt => ({
      date: new Date(apt.appointment_date).toLocaleDateString(),
      time: apt.appointment_time || 'TBD',
      provider: apt.profiles?.full_name || 'Provider',
      type: apt.appointment_type || 'Consultation'
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
    'nutrition': 'Apple'
  };
  return iconMap[type] || 'Target';
};
