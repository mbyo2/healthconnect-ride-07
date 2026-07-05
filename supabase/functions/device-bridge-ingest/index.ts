// Device bridge ingest — receives HL7/normalized readings from on-site
// `@doc-o-clock/device-bridge` package and writes them to device_data_feeds /
// device_alerts. Authenticated with a per-institution HMAC token so the
// service-role key never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const BRIDGE_SECRET = Deno.env.get('DEVICE_BRIDGE_SECRET') ?? ''

const ReadingSchema = z.object({
  device_id: z.string().uuid(),
  patient_id: z.string().uuid().optional().nullable(),
  data_type: z.string().min(1).max(64),
  data_value: z.record(z.any()),
  unit: z.string().max(32).optional().nullable(),
  is_critical: z.boolean().optional().default(false),
  recorded_at: z.string().datetime().optional(),
  alert: z
    .object({
      alert_type: z.string().min(1).max(64),
      severity: z.enum(['info', 'warning', 'critical']),
      message: z.string().min(1).max(500),
    })
    .optional(),
})

const PayloadSchema = z.object({
  institution_id: z.string().uuid(),
  readings: z.array(ReadingSchema).min(1).max(100),
})

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!BRIDGE_SECRET) {
      return new Response(JSON.stringify({ error: 'Bridge not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const raw = await req.text()
    const token = req.headers.get('x-bridge-token') ?? ''
    const institutionHeader = req.headers.get('x-institution-id') ?? ''
    if (!token || !institutionHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth headers' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expected = await hmac(BRIDGE_SECRET, institutionHeader)
    if (token !== expected) {
      return new Response(JSON.stringify({ error: 'Invalid bridge token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = PayloadSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (parsed.data.institution_id !== institutionHeader) {
      return new Response(JSON.stringify({ error: 'Institution mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify every device belongs to this institution + fetch bed_id mapping
    const deviceIds = [...new Set(parsed.data.readings.map((r) => r.device_id))]
    const { data: devices, error: devErr } = await supabase
      .from('institution_devices')
      .select('id, institution_id, bed_id')
      .in('id', deviceIds)
    if (devErr) throw devErr
    const mismatched = devices?.find((d) => d.institution_id !== parsed.data.institution_id)
    if (mismatched || (devices?.length ?? 0) !== deviceIds.length) {
      return new Response(JSON.stringify({ error: 'Unknown or foreign device' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build device -> patient map via active hospital_admissions bed assignment
    const bedIds = [...new Set((devices ?? []).map((d) => d.bed_id).filter(Boolean))] as string[]
    const devicePatientMap = new Map<string, string | null>()
    if (bedIds.length) {
      const { data: admissions } = await supabase
        .from('hospital_admissions')
        .select('bed_id, patient_id, status')
        .in('bed_id', bedIds)
        .in('status', ['active', 'admitted'])
      const bedToPatient = new Map<string, string>()
      for (const a of admissions ?? []) {
        if (a.bed_id && a.patient_id) bedToPatient.set(a.bed_id, a.patient_id)
      }
      // Fallback: hospital_beds.current_patient_id
      const unresolvedBeds = bedIds.filter((b) => !bedToPatient.has(b))
      if (unresolvedBeds.length) {
        const { data: beds } = await supabase
          .from('hospital_beds')
          .select('id, current_patient_id')
          .in('id', unresolvedBeds)
        for (const b of beds ?? []) {
          if (b.current_patient_id) bedToPatient.set(b.id, b.current_patient_id)
        }
      }
      for (const d of devices ?? []) {
        devicePatientMap.set(d.id, d.bed_id ? bedToPatient.get(d.bed_id) ?? null : null)
      }
    }

    const feedRows = parsed.data.readings.map((r) => ({
      device_id: r.device_id,
      institution_id: parsed.data.institution_id,
      patient_id: r.patient_id ?? devicePatientMap.get(r.device_id) ?? null,
      data_type: r.data_type,
      data_value: r.data_value,
      unit: r.unit ?? null,
      is_critical: r.is_critical ?? false,
      recorded_at: r.recorded_at ?? new Date().toISOString(),
    }))
    const { error: insErr } = await supabase.from('device_data_feeds').insert(feedRows)
    if (insErr) throw insErr

    const alertRows = parsed.data.readings
      .filter((r) => r.alert)
      .map((r) => ({
        device_id: r.device_id,
        alert_type: r.alert!.alert_type,
        severity: r.alert!.severity,
        message: r.alert!.message,
      }))
    if (alertRows.length) {
      await supabase.from('device_alerts').insert(alertRows)
    }

    // Heartbeat
    await supabase
      .from('institution_devices')
      .update({ last_heartbeat: new Date().toISOString() })
      .in('id', deviceIds)

    // Auto-update active triage sessions when critical vitals arrive
    const criticalRows = feedRows.filter((r) => r.is_critical && r.patient_id)
    const escalated: string[] = []
    for (const row of criticalRows) {
      const { data: sess } = await supabase
        .from('patient_triage_sessions')
        .select('id, urgency, red_flags, reasoning')
        .eq('patient_id', row.patient_id!)
        .in('status', ['open', 'active', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const flag = `Critical ${row.data_type} from bedside device`
      if (sess) {
        const flags = Array.from(new Set([...(sess.red_flags ?? []), flag]))
        await supabase
          .from('patient_triage_sessions')
          .update({
            urgency: 'emergency',
            red_flags: flags,
            reasoning: `${sess.reasoning ?? ''}\n[auto] ${flag} at ${row.recorded_at}`.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sess.id)
        escalated.push(sess.id)
      }
    }


    return new Response(
      JSON.stringify({ ok: true, ingested: feedRows.length, triage_escalated: escalated.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('device-bridge-ingest error', e)
    return new Response(JSON.stringify({ error: 'Ingest failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
