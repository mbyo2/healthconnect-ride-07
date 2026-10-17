/**
 * fhir-inbound — Accept FHIR Bundles from external healthcare systems.
 *
 * POST { bundle: FHIRBundle, source_system: string }
 *
 * Validates the bundle, maps supported resources to internal tables:
 *   Patient            -> profiles (match by identifier/email, else create stub)
 *   Condition          -> comprehensive_medical_records (record_type diagnosis/condition)
 *   MedicationRequest  -> comprehensive_prescriptions
 *   Observation        -> comprehensive_health_metrics
 *
 * Every inbound exchange is logged to fhir_exchanges (direction=inbound)
 * and to audit_logs. Requires a user JWT (the receiving clinician/admin).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

const SUPPORTED = ['Patient', 'Condition', 'MedicationRequest', 'Observation'];

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return bad('Method not allowed', 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return bad('Missing authorization', 401);

    // Verify the caller's identity with the anon client
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return bad('Unauthorized', 401);

    // Service-role client for writes (bypasses RLS; we enforce auth above)
    const db = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { bundle, source_system } = body || {};

    if (!source_system || typeof source_system !== 'string') {
      return bad('source_system is required');
    }
    if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
      return bad('Invalid FHIR Bundle: resourceType must be "Bundle" with an entry array');
    }

    const entries = bundle.entry.map((e: any) => e.resource).filter(Boolean);
    const unsupported = entries
      .map((r: any) => r.resourceType)
      .filter((t: string) => !SUPPORTED.includes(t));
    if (unsupported.length > 0) {
      return bad(`Unsupported resource types: ${[...new Set(unsupported)].join(', ')}. Supported: ${SUPPORTED.join(', ')}`);
    }

    // Log the inbound exchange first (status=received)
    const { data: exchange } = await db.from('fhir_exchanges').insert({
      direction: 'inbound',
      target_system: source_system,
      resources: [...new Set(entries.map((r: any) => r.resourceType))],
      status: 'received',
      bundle,
      initiated_by: user.id,
    }).select('id').single();

    const results: Array<{ resourceType: string; action: string; id?: string }> = [];
    let patientId: string | null = null;

    // 1. Patient — match by identifier or telecom, else create a stub profile link.
    //    We never auto-create auth.users; inbound patients are matched to
    //    existing users, otherwise the resources are quarantined to the exchange log.
    const fhirPatient = entries.find((r: any) => r.resourceType === 'Patient');
    if (fhirPatient) {
      const email = fhirPatient.telecom?.find((t: any) => t.system === 'email')?.value;
      const identifier = fhirPatient.identifier?.[0]?.value;
      let matched: any = null;

      if (email) {
        const { data } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
        matched = data;
      }
      if (!matched && identifier) {
        const { data } = await db.from('profiles').select('id').eq('id', identifier).maybeSingle();
        matched = data;
      }
      if (matched) {
        patientId = matched.id;
        results.push({ resourceType: 'Patient', action: 'matched', id: patientId! });
      } else {
        results.push({ resourceType: 'Patient', action: 'quarantined_no_match' });
      }
    }

    // Without a matched patient we cannot safely file clinical resources.
    if (!patientId) {
      await db.from('fhir_exchanges').update({
        status: 'rejected',
        error_message: 'No matching patient found; resources quarantined in exchange log',
        updated_at: new Date().toISOString(),
      }).eq('id', exchange?.id);

      await db.from('audit_logs').insert({
        user_id: user.id,
        action: 'fhir_inbound_rejected',
        resource: 'fhir_exchanges',
        resource_id: exchange?.id,
        details: { source_system, reason: 'no_patient_match', resource_types: results.map(r => r.resourceType) },
        severity: 'warning',
        category: 'data_modification',
        outcome: 'failure',
      });

      return new Response(JSON.stringify({ ok: false, status: 'rejected', results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await db.from('fhir_exchanges').update({ patient_id: patientId }).eq('id', exchange?.id);

    // 2. Conditions -> comprehensive_medical_records
    for (const c of entries.filter((r: any) => r.resourceType === 'Condition')) {
      const { data, error } = await db.from('comprehensive_medical_records').insert({
        patient_id: patientId,
        provider_id: user.id,
        record_type: 'diagnosis',
        title: c.code?.text || c.code?.coding?.[0]?.display || 'Imported condition',
        description: c.note?.[0]?.text || null,
        clinical_data: { fhir: c },
        visit_date: (c.recordedDate || new Date().toISOString()).slice(0, 10),
        status: c.clinicalStatus?.coding?.[0]?.code === 'resolved' ? 'resolved' : 'active',
      }).select('id').single();
      if (!error) results.push({ resourceType: 'Condition', action: 'imported', id: data.id });
    }

    // 3. MedicationRequests -> comprehensive_prescriptions
    // Schema: dosage/quantity/instructions NOT NULL; status in
    // ('pending','filled','partially_filled','cancelled','expired')
    for (const m of entries.filter((r: any) => r.resourceType === 'MedicationRequest')) {
      const qty = m.dispenseRequest?.quantity?.value;
      const { data, error } = await db.from('comprehensive_prescriptions').insert({
        patient_id: patientId,
        provider_id: user.id,
        medication_name: m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || 'Imported medication',
        dosage: m.dosageInstruction?.[0]?.text || 'As directed',
        quantity: Number.isFinite(Number(qty)) ? Math.max(1, Math.floor(Number(qty))) : 1,
        instructions: m.dosageInstruction?.[0]?.patientInstruction || m.dosageInstruction?.[0]?.text || 'As directed',
        status: 'pending',
        prescribed_date: (m.authoredOn || new Date().toISOString()).slice(0, 10),
        notes: `Imported via FHIR from ${source_system}`,
      }).select('id').single();
      if (!error) results.push({ resourceType: 'MedicationRequest', action: 'imported', id: data.id });
    }

    // 4. Observations -> comprehensive_health_metrics
    // Schema: metric_category NOT NULL; value NUMERIC NOT NULL; unit NOT NULL
    for (const o of entries.filter((r: any) => r.resourceType === 'Observation')) {
      const rawValue = o.valueQuantity?.value;
      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        results.push({ resourceType: 'Observation', action: 'skipped_non_numeric' });
        continue;
      }
      const { data, error } = await db.from('comprehensive_health_metrics').insert({
        user_id: patientId,
        metric_category: 'vital_signs',
        metric_name: o.code?.text || o.code?.coding?.[0]?.display || 'Imported observation',
        value: numericValue,
        unit: o.valueQuantity?.unit || 'unit',
        recorded_at: o.effectiveDateTime || new Date().toISOString(),
        recorded_by: user.id,
        notes: `Imported via FHIR from ${source_system}`,
        is_patient_entered: false,
      }).select('id').single();
      if (!error) results.push({ resourceType: 'Observation', action: 'imported', id: data.id });
    }

    await db.from('fhir_exchanges').update({
      status: 'processed',
      updated_at: new Date().toISOString(),
    }).eq('id', exchange?.id);

    await db.from('audit_logs').insert({
      user_id: user.id,
      action: 'fhir_inbound_processed',
      resource: 'fhir_exchanges',
      resource_id: exchange?.id,
      details: { source_system, patient_id: patientId, imported: results.length },
      severity: 'info',
      category: 'data_modification',
      outcome: 'success',
    });

    return new Response(JSON.stringify({ ok: true, status: 'processed', exchange_id: exchange?.id, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('fhir-inbound error:', e);
    return bad(e instanceof Error ? e.message : 'Internal error', 500);
  }
});
