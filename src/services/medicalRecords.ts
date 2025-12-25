
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
      .from('comprehensive_medical_records')
      .select(`
        id,
        title,
        visit_date,
        record_type,
        status,
        provider:profiles!comprehensive_medical_records_provider_id_fkey(first_name, last_name)
      `)
      .eq('patient_id', user.id)
      .order('visit_date', { ascending: false });

    return records?.map(record => ({
      id: record.id,
      title: record.title,
      date: record.visit_date,
      provider: record.provider ? `Dr. ${record.provider.first_name} ${record.provider.last_name}` : 'Healthcare Provider',
      type: record.record_type,
      status: record.status || 'Active'
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
      .from('comprehensive_health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(4);

    return metrics?.map(metric => ({
      label: metric.metric_name,
      value: `${metric.value} ${metric.unit}`,
      date: new Date(metric.recorded_at).toLocaleDateString(),
      status: metric.status || 'Normal'
    })) || [];
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return [];
  }
};

export const updateMedicalRecord = async (id: string, updates: Partial<MedicalRecord>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('comprehensive_medical_records')
      .update({
        title: updates.title,
        record_type: updates.type,
        status: updates.status,
        visit_date: updates.date,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating medical record:', error);
    return false;
  }
};
