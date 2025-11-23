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

// Fetch the most recent health metrics for the user and map them to HealthStat entries
export const getHealthStats = async (): Promise<HealthStat[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: metrics } = await supabase
      .from('daily_health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1);

    if (!metrics || metrics.length === 0) return [];
    const metric = metrics[0];

    const stats: HealthStat[] = [];
    if (metric.steps !== undefined) {
      stats.push({
        title: 'Steps',
        value: metric.steps.toString(),
        unit: 'steps',
        status: 'Normal',
        trend: 'stable',
        icon: getIconForMetricType('steps')
      });
    }
    if (metric.calories_burned !== undefined) {
      stats.push({
        title: 'Calories Burned',
        value: metric.calories_burned.toString(),
        unit: 'kcal',
        status: 'Normal',
        trend: 'stable',
        icon: getIconForMetricType('calories')
      });
    }
    if (metric.distance !== undefined) {
      stats.push({
        title: 'Distance',
        value: metric.distance.toString(),
        unit: 'km',
        status: 'Normal',
        trend: 'stable',
        icon: getIconForMetricType('distance')
      });
    }
    if (metric.active_minutes !== undefined) {
      stats.push({
        title: 'Active Minutes',
        value: metric.active_minutes.toString(),
        unit: 'min',
        status: 'Normal',
        trend: 'stable',
        icon: getIconForMetricType('active_minutes')
      });
    }
    if (metric.sleep_hours !== undefined) {
      stats.push({
        title: 'Sleep Hours',
        value: metric.sleep_hours.toString(),
        unit: 'h',
        status: 'Normal',
        trend: 'stable',
        icon: getIconForMetricType('sleep')
      });
    }
    if (metric.water_intake !== undefined) {
      stats.push({
        title: 'Water Intake',
        value: metric.water_intake.toString(),
        unit: 'L',
        status: 'Normal',
        trend: 'stable',
        icon: getIconForMetricType('water')
      });
    }
    return stats;
  } catch (error) {
    console.error('Error fetching health stats:', error);
    return [];
  }
};

// Generate mock health goals based on the latest health metrics
export const getHealthGoals = async (): Promise<HealthGoal[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: metrics } = await supabase
      .from('daily_health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1);

    if (!metrics || metrics.length === 0) return [];
    const metric = metrics[0];

    const goals: HealthGoal[] = [];
    if (metric.steps !== undefined) {
      goals.push({
        title: 'Steps Goal',
        current: metric.steps,
        target: getTargetForMetricType('steps'),
        icon: getIconForGoalType('steps')
      });
    }
    if (metric.water_intake !== undefined) {
      goals.push({
        title: 'Water Intake Goal',
        current: metric.water_intake,
        target: getTargetForMetricType('water'),
        icon: getIconForGoalType('water')
      });
    }
    if (metric.active_minutes !== undefined) {
      goals.push({
        title: 'Active Minutes Goal',
        current: metric.active_minutes,
        target: getTargetForMetricType('exercise'),
        icon: getIconForGoalType('exercise')
      });
    }
    // Add more goals as needed based on available columns
    return goals;
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
    'temperature': 'Thermometer',
    'steps': 'Footprints',
    'calories': 'Fire',
    'distance': 'MapPin',
    'active_minutes': 'Activity',
    'water': 'Droplets'
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
