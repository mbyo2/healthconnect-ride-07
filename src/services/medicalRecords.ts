
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

    // Comprehensive records plus completed imaging orders (imaging results live
    // in imaging_orders, not comprehensive_medical_records).
    const [recordsRes, imagingRes] = await Promise.all([
      (supabase as any)
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
        .order('visit_date', { ascending: false }),
      (supabase.from('imaging_orders' as any) as any)
        .select('id, order_number, modality, body_part, status, findings, impression, created_at, completed_at')
        .eq('patient_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false }),
    ]);

    const rows: any[] = recordsRes.data || [];

    const mapped = rows.map((record) => ({
      id: record.id,
      title: record.title,
      date: record.visit_date,
      provider: record.provider ? `Dr. ${record.provider.first_name} ${record.provider.last_name}` : 'Healthcare Provider',
      type: record.record_type,
      status: record.status || 'Active'
    }));

    const imagingRecords: MedicalRecord[] = (imagingRes.data || []).map((img: any) => ({
      id: `imaging-${img.id}`,
      title: `Imaging: ${img.modality} - ${img.body_part} (${img.order_number})`,
      date: img.completed_at || img.created_at,
      provider: 'Radiology',
      type: 'imaging',
      status: 'Completed'
    }));

    return [...mapped, ...imagingRecords].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  } catch (error) {
    console.error('Error fetching medical records:', error);
    return [];
  }
};

export const getHealthMetrics = async (): Promise<HealthMetric[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const [{ data: metrics }, { data: vitals }] = await Promise.all([
      supabase
        .from('comprehensive_health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(50),
      // Nurses/providers record vitals into vital_signs; surface those here too
      // so patients see clinician-recorded vitals in their records.
      supabase
        .from('vital_signs')
        .select('blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10),
    ]);

    // Dedupe to the latest reading per metric name (a vitals recording saves
    // ~8 rows at once; without this only an arbitrary subset was shown).
    const latest = new Map<string, (typeof metrics)[number]>();
    for (const m of metrics ?? []) {
      if (!latest.has(m.metric_name)) latest.set(m.metric_name, m);
    }

    const result: HealthMetric[] = [...latest.values()].map(metric => ({
      label: metric.metric_name,
      value: `${metric.value} ${metric.unit}`,
      date: new Date(metric.recorded_at).toLocaleDateString(),
      status: metric.status || 'Normal'
    }));

    // Merge the latest clinician-recorded vitals (if any) that aren't already covered.
    const v = (vitals ?? [])[0] as any;
    if (v) {
      const vDate = new Date(v.recorded_at).toLocaleDateString();
      const has = (label: string) => result.some(r => r.label.toLowerCase().includes(label));
      if (v.blood_pressure_systolic && v.blood_pressure_diastolic && !has('blood pressure')) {
        result.push({ label: 'Blood Pressure', value: `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic} mmHg`, date: vDate, status: 'Normal' });
      }
      if (v.heart_rate && !has('heart rate')) {
        result.push({ label: 'Heart Rate', value: `${v.heart_rate} bpm`, date: vDate, status: 'Normal' });
      }
      if (v.temperature && !has('temperature')) {
        result.push({ label: 'Temperature', value: `${v.temperature} °C`, date: vDate, status: 'Normal' });
      }
      if (v.oxygen_saturation && !has('oxygen')) {
        result.push({ label: 'Oxygen Saturation', value: `${v.oxygen_saturation} %`, date: vDate, status: 'Normal' });
      }
      if (v.respiratory_rate && !has('respiratory')) {
        result.push({ label: 'Respiratory Rate', value: `${v.respiratory_rate} /min`, date: vDate, status: 'Normal' });
      }
    }

    return result;
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
