import { supabase } from "@/integrations/supabase/client";
import { METRIC_ICON_MAP, GOAL_ICON_MAP, METRIC_TARGET_MAP } from "@/config/healthMetrics";

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

    // Fetch latest metrics from comprehensive table
    const { data: metrics } = await supabase
      .from('comprehensive_health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('metric_category', 'lifestyle')
      .order('recorded_at', { ascending: false })
      .limit(20); // Get enough recent records to find one of each type

    if (!metrics || metrics.length === 0) return [];

    // Helper to find latest value for a metric name
    const getLatestMetric = (name: string) => metrics.find(m => m.metric_name === name);

    const stats: HealthStat[] = [];

    const steps = getLatestMetric('steps');
    if (steps) {
      stats.push({
        title: 'Steps',
        value: steps.value.toString(),
        unit: steps.unit,
        status: steps.status || 'Normal',
        trend: (steps.trend_direction as any) || 'stable',
        icon: getIconForMetricType('steps')
      });
    }

    const calories = getLatestMetric('calories_burned');
    if (calories) {
      stats.push({
        title: 'Calories Burned',
        value: calories.value.toString(),
        unit: calories.unit,
        status: calories.status || 'Normal',
        trend: (calories.trend_direction as any) || 'stable',
        icon: getIconForMetricType('calories')
      });
    }

    const distance = getLatestMetric('distance');
    if (distance) {
      stats.push({
        title: 'Distance',
        value: distance.value.toString(),
        unit: distance.unit,
        status: distance.status || 'Normal',
        trend: (distance.trend_direction as any) || 'stable',
        icon: getIconForMetricType('distance')
      });
    }

    const activeMinutes = getLatestMetric('active_minutes');
    if (activeMinutes) {
      stats.push({
        title: 'Active Minutes',
        value: activeMinutes.value.toString(),
        unit: activeMinutes.unit,
        status: activeMinutes.status || 'Normal',
        trend: (activeMinutes.trend_direction as any) || 'stable',
        icon: getIconForMetricType('active_minutes')
      });
    }

    const sleep = getLatestMetric('sleep_hours');
    if (sleep) {
      stats.push({
        title: 'Sleep Hours',
        value: sleep.value.toString(),
        unit: sleep.unit,
        status: sleep.status || 'Normal',
        trend: (sleep.trend_direction as any) || 'stable',
        icon: getIconForMetricType('sleep')
      });
    }

    const water = getLatestMetric('water_intake');
    if (water) {
      stats.push({
        title: 'Water Intake',
        value: water.value.toString(),
        unit: water.unit,
        status: water.status || 'Normal',
        trend: (water.trend_direction as any) || 'stable',
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
      .from('comprehensive_health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('metric_category', 'lifestyle')
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (!metrics || metrics.length === 0) return [];

    const getLatestMetric = (name: string) => metrics.find(m => m.metric_name === name);
    const goals: HealthGoal[] = [];

    const steps = getLatestMetric('steps');
    if (steps) {
      goals.push({
        title: 'Steps Goal',
        current: Number(steps.value),
        target: getTargetForMetricType('steps'),
        icon: getIconForGoalType('steps')
      });
    }

    const water = getLatestMetric('water_intake');
    if (water) {
      goals.push({
        title: 'Water Intake Goal',
        current: Number(water.value),
        target: getTargetForMetricType('water'),
        icon: getIconForGoalType('water')
      });
    }

    const activeMinutes = getLatestMetric('active_minutes');
    if (activeMinutes) {
      goals.push({
        title: 'Active Minutes Goal',
        current: Number(activeMinutes.value),
        target: getTargetForMetricType('exercise'),
        icon: getIconForGoalType('exercise')
      });
    }

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
  return METRIC_ICON_MAP[type] || 'Activity';
};

const getIconForGoalType = (type: string): string => {
  return GOAL_ICON_MAP[type] || 'Target';
};

const getTargetForMetricType = (type: string): number => {
  return METRIC_TARGET_MAP[type] || 100;
};
