import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { patientId, resourceTypes } = await req.json();
    const targetId = patientId || user.id;

    // Get profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).single();

    const bundle: any = {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      meta: { lastUpdated: new Date().toISOString() },
      entry: [],
    };

    // Patient resource
    if (!resourceTypes || resourceTypes.includes('Patient')) {
      bundle.entry.push({
        resource: {
          resourceType: 'Patient',
          id: targetId,
          name: [{ family: profile?.last_name, given: [profile?.first_name] }],
          telecom: profile?.email ? [{ system: 'email', value: profile.email }] : [],
          gender: profile?.gender || 'unknown',
          birthDate: profile?.date_of_birth,
        },
      });
    }

    // Conditions from medical records
    if (!resourceTypes || resourceTypes.includes('Condition')) {
      const { data: records } = await supabase
        .from('comprehensive_medical_records')
        .select('*')
        .eq('patient_id', targetId)
        .in('record_type', ['diagnosis', 'condition', 'chronic_condition']);

      (records || []).forEach((r: any) => {
        bundle.entry.push({
          resource: {
            resourceType: 'Condition',
            id: r.id,
            subject: { reference: `Patient/${targetId}` },
            code: { text: r.title },
            note: r.description ? [{ text: r.description }] : [],
            recordedDate: r.visit_date,
            clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: r.status === 'resolved' ? 'resolved' : 'active' }] },
          },
        });
      });
    }

    // MedicationRequests from prescriptions
    if (!resourceTypes || resourceTypes.includes('MedicationRequest')) {
      const { data: prescriptions } = await supabase
        .from('comprehensive_prescriptions')
        .select('*')
        .eq('patient_id', targetId);

      (prescriptions || []).forEach((rx: any) => {
        bundle.entry.push({
          resource: {
            resourceType: 'MedicationRequest',
            id: rx.id,
            status: rx.status === 'active' ? 'active' : rx.status === 'completed' ? 'completed' : 'stopped',
            intent: 'order',
            medicationCodeableConcept: { text: rx.medication_name },
            subject: { reference: `Patient/${targetId}` },
            dosageInstruction: [{ text: `${rx.dosage} - ${rx.instructions}`, timing: { repeat: { duration: rx.duration_days, durationUnit: 'd' } } }],
            dispenseRequest: { quantity: { value: rx.quantity } },
            authoredOn: rx.prescribed_date,
          },
        });
      });
    }

    // Observations from health metrics
    if (!resourceTypes || resourceTypes.includes('Observation')) {
      const { data: metrics } = await supabase
        .from('comprehensive_health_metrics')
        .select('*')
        .eq('user_id', targetId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      (metrics || []).forEach((m: any) => {
        bundle.entry.push({
          resource: {
            resourceType: 'Observation',
            id: m.id,
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: { text: m.metric_name },
            subject: { reference: `Patient/${targetId}` },
            effectiveDateTime: m.recorded_at,
            valueQuantity: { value: m.value, unit: m.unit },
            referenceRange: m.reference_range_min != null ? [{ low: { value: m.reference_range_min }, high: { value: m.reference_range_max } }] : undefined,
          },
        });
      });
    }

    // Appointments
    if (!resourceTypes || resourceTypes.includes('Appointment')) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', targetId);

      (appointments || []).forEach((a: any) => {
        bundle.entry.push({
          resource: {
            resourceType: 'Appointment',
            id: a.id,
            status: a.status === 'scheduled' ? 'booked' : a.status === 'completed' ? 'fulfilled' : 'cancelled',
            start: `${a.date}T${a.time}:00`,
            minutesDuration: a.duration || 30,
            participant: [
              { actor: { reference: `Patient/${targetId}` }, status: 'accepted' },
              { actor: { reference: `Practitioner/${a.provider_id}` }, status: 'accepted' },
            ],
          },
        });
      });
    }

    bundle.total = bundle.entry.length;

    return new Response(JSON.stringify(bundle, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/fhir+json' },
    });
  } catch (error) {
    console.error('FHIR export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
