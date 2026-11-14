// Tiny HL7 v2 ORU^R01 parser — extracts OBX segments to canonical readings.
// We deliberately do NOT depend on `simple-hl7` for the core path so the
// package works even when the optional dep is unavailable (offline installs).
import type { CanonicalReading } from './types.js'

const LOINC_MAP: Record<string, { data_type: string; unit?: string; critical?: [number, number] }> = {
  '8867-4': { data_type: 'heart_rate', unit: 'bpm', critical: [40, 130] },
  '59408-5': { data_type: 'spo2', unit: '%', critical: [90, 100] },
  // Critical bands are the device/clinical alert limits, NOT hypertensive-crisis
  // levels: systolic >= 140 mmHg is ACC/AHA Stage 2 hypertension and the top of
  // the reference range monitors themselves report (OBX-7, e.g. 90-140), so a
  // systolic of 141-179 must already raise the critical alert — the old upper
  // bound of 180 (crisis level) silently missed that whole range. Same for
  // diastolic: ACC/AHA Stage 2 starts at >= 90 mmHg, so a diastolic of 91+
  // must already raise the critical alert — the old upper bound of 110
  // silently missed 91-110. (Band is the safe range and the check is strict,
  // so the threshold value itself is not critical: 140/90 safe, 141/91 alert.)
  '8480-6': { data_type: 'systolic_bp', unit: 'mmHg', critical: [90, 140] },
  '8462-4': { data_type: 'diastolic_bp', unit: 'mmHg', critical: [50, 90] },
  '8310-5': { data_type: 'temperature', unit: 'degC', critical: [35, 39] },
  '9279-1': { data_type: 'respiratory_rate', unit: '/min', critical: [8, 30] },
  '19889-5': { data_type: 'etco2', unit: 'mmHg', critical: [30, 50] },
}

export function parseOru(raw: string, deviceId: string, patientId?: string | null): CanonicalReading[] {
  const segments = raw.split(/\r|\n/).filter((s) => s.trim().length > 0)
  const readings: CanonicalReading[] = []
  for (const seg of segments) {
    const fields = seg.split('|')
    if (fields[0] !== 'OBX') continue
    // OBX-3 = observation id, OBX-5 = value, OBX-6 = unit, OBX-14 = timestamp
    const obsId = (fields[3] ?? '').split('^')
    const loinc = obsId[0]
    const nameFallback = obsId[1] ?? 'unknown'
    const rawValue = fields[5] ?? ''
    const unit = (fields[6] ?? '').split('^')[0] || undefined
    const ts = fields[14]
    const meta = LOINC_MAP[loinc] ?? { data_type: nameFallback.toLowerCase().replace(/\s+/g, '_'), unit }
    const numeric = Number.parseFloat(rawValue)
    const value: Record<string, unknown> = Number.isFinite(numeric)
      ? { value: numeric }
      : { value: rawValue }
    const critical =
      meta.critical && Number.isFinite(numeric)
        ? numeric < meta.critical[0] || numeric > meta.critical[1]
        : false
    readings.push({
      device_id: deviceId,
      patient_id: patientId ?? null,
      data_type: meta.data_type,
      data_value: value,
      unit: unit ?? meta.unit ?? null,
      is_critical: critical,
      recorded_at: parseHl7Ts(ts),
      alert: critical
        ? {
            alert_type: `${meta.data_type}_out_of_range`,
            severity: 'critical',
            message: `${meta.data_type} = ${numeric} ${unit ?? meta.unit ?? ''} out of ${meta.critical![0]}–${meta.critical![1]}`,
          }
        : undefined,
    })
  }
  return readings
}

export function extractPatientId(raw: string): string | null {
  const pid = raw.split(/\r|\n/).find((s) => s.startsWith('PID|'))
  if (!pid) return null
  const fields = pid.split('|')
  const id = (fields[3] ?? '').split('^')[0]
  // Only forward UUIDs — otherwise leave unlinked; front-desk can reconcile.
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

function parseHl7Ts(ts?: string): string | undefined {
  if (!ts) return undefined
  const m = ts.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/)
  if (!m) return undefined
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString()
}
