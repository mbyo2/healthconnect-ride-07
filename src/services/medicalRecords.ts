
import { supabase } from "@/integrations/supabase/client";

export interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  provider: string;
  type: string;
  status: string;
}

export interface HealthMetric {
  label: string;
  value: string;
  date: string;
  status: string;
}

export const getMedicalRecords = async (): Promise<MedicalRecord[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: records } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', user.id)
      .order('date', { ascending: false });

    return records?.map(record => ({
      id: record.id,
      title: record.record_type || 'Medical Record',
      date: record.date,
      provider: 'Healthcare Provider', // Since provider_name doesn't exist in schema
      type: record.record_type || 'General',
      status: 'Complete' // Since status doesn't exist in schema, use default
    })) || [];
  } catch (error) {
    console.error('Error fetching medical records:', error);
    return [];
  }
};

export const getHealthMetrics = async (): Promise<HealthMetric[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: metrics } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(4);

    return metrics?.map(metric => ({
      label: metric.metric_type,
      value: `${metric.value} ${metric.unit || ''}`,
      date: new Date(metric.recorded_at).toLocaleDateString(),
      status: 'Normal'
    })) || [];
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return [];
  }
};
