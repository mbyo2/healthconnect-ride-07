// Philips IntelliVue Data Export — MP/MX bedside monitors expose readings
// over TCP as either HL7 ORU (v2.4) or the native IntelliVue Data Export
// XML. We accept both on the same port; anything starting with '<?xml' is
// treated as IDE XML, everything else as HL7.
import { createServer } from 'node:net'
import { parseOru, extractPatientId } from '../hl7.js'
import type { DeviceConfig, CanonicalReading } from '../types.js'

const XML_METRIC = /<Numeric[^>]*Code="([^"]+)"[^>]*Value="([^"]+)"(?:[^>]*Unit="([^"]+)")?/g
const IDE_MAP: Record<string, { data_type: string; unit?: string }> = {
  '147842': { data_type: 'heart_rate', unit: 'bpm' },
  '150456': { data_type: 'spo2', unit: '%' },
  '150033': { data_type: 'systolic_bp', unit: 'mmHg' },
  '150034': { data_type: 'diastolic_bp', unit: 'mmHg' },
  '150364': { data_type: 'temperature', unit: 'degC' },
  '151562': { data_type: 'etco2', unit: 'mmHg' },
}

function parseIde(xml: string, deviceId: string): CanonicalReading[] {
  const out: CanonicalReading[] = []
  let m: RegExpExecArray | null
  while ((m = XML_METRIC.exec(xml))) {
    const [, code, value, unit] = m
    const meta = IDE_MAP[code] ?? { data_type: `philips_${code}`, unit }
    const numeric = Number.parseFloat(value)
    out.push({
      device_id: deviceId,
      data_type: meta.data_type,
      data_value: { value: Number.isFinite(numeric) ? numeric : value },
      unit: unit ?? meta.unit ?? null,
      recorded_at: new Date().toISOString(),
    })
  }
  return out
}

export function startPhilipsIntellivue(device: DeviceConfig, emit: (r: CanonicalReading) => void) {
  const port = device.listen_port ?? 24105
  const server = createServer((socket) => {
    let buf = ''
    socket.on('data', (chunk) => {
      buf += chunk.toString('utf8')
      // Split on double-newline (IDE XML docs) or HL7 MLLP end
      const trimmed = buf.trim()
      if (trimmed.startsWith('<?xml')) {
        for (const r of parseIde(trimmed, device.id)) emit(r)
        buf = ''
      } else if (buf.includes('\x1c')) {
        const raw = buf.replace(/[\x0b\x1c\x0d]/g, (c) => (c === '\x0d' ? '\r' : '')).trim()
        const pid = extractPatientId(raw)
        for (const r of parseOru(raw, device.id, pid)) emit(r)
        buf = ''
      }
    })
    socket.on('error', (e) => console.error('[philips] socket', e.message))
  })
  server.listen(port, process.env.BIND_HOST ?? '0.0.0.0', () =>
    console.log(`[philips] listening on ${port}`),
  )
}
