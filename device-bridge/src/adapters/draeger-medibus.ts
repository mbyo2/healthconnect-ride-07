// Dräger Medibus / Medibus.X — serial protocol. Frames are ASCII with a
// SOH (0x01) start and a CR (0x0d) end. Numeric data-block replies use
// two-hex-digit codes followed by 6-char right-justified values.
import type { DeviceConfig, CanonicalReading } from '../types.js'

const MEDIBUS_CODES: Record<string, { data_type: string; unit?: string }> = {
  '78': { data_type: 'heart_rate', unit: 'bpm' },
  '50': { data_type: 'spo2', unit: '%' },
  '4A': { data_type: 'systolic_bp', unit: 'mmHg' },
  '4B': { data_type: 'diastolic_bp', unit: 'mmHg' },
  '54': { data_type: 'temperature', unit: 'degC' },
  '90': { data_type: 'etco2', unit: 'mmHg' },
  'A0': { data_type: 'peep', unit: 'cmH2O' },
  'A1': { data_type: 'peak_pressure', unit: 'cmH2O' },
  'A2': { data_type: 'tidal_volume', unit: 'mL' },
  'A3': { data_type: 'minute_volume', unit: 'L/min' },
}

function parseMedibus(frame: string, deviceId: string): CanonicalReading[] {
  const body = frame.replace(/^\x01/, '').replace(/\x0d$/, '')
  // Skip 4-char cmd + 2-char checksum if present
  const payload = body.length > 6 ? body.slice(4, -2) : body
  const out: CanonicalReading[] = []
  for (let i = 0; i + 8 <= payload.length; i += 8) {
    const code = payload.slice(i, i + 2)
    const value = payload.slice(i + 2, i + 8).trim()
    const meta = MEDIBUS_CODES[code]
    if (!meta) continue
    const numeric = Number.parseFloat(value)
    if (!Number.isFinite(numeric)) continue
    out.push({
      device_id: deviceId,
      data_type: meta.data_type,
      data_value: { value: numeric },
      unit: meta.unit ?? null,
      recorded_at: new Date().toISOString(),
    })
  }
  return out
}

export function startDraegerMedibus(device: DeviceConfig, emit: (r: CanonicalReading) => void) {
  if (device.transport !== 'serial' || !device.serial_path) {
    console.warn(`[draeger] ${device.name}: serial_path required, skipping`)
    return
  }
  // Lazy import — serialport is a native module and may not be installed in
  // dev environments; we don't want to crash the bridge for unrelated devices.
  import('serialport')
    .then(({ SerialPort }) => {
      const port = new SerialPort({ path: device.serial_path!, baudRate: device.baud ?? 19200 })
      let buf = ''
      port.on('data', (chunk: Buffer) => {
        buf += chunk.toString('binary')
        let end = buf.indexOf('\x0d')
        while (end !== -1) {
          const frame = buf.slice(0, end + 1)
          buf = buf.slice(end + 1)
          for (const r of parseMedibus(frame, device.id)) emit(r)
          end = buf.indexOf('\x0d')
        }
      })
      port.on('error', (e) => console.error('[draeger]', e.message))
      // Poll for numeric data block every 1s (ICC / Numeric-Data cmd 0x24)
      setInterval(() => port.write(Buffer.from('\x0124\x0d')), 1000)
    })
    .catch((e) => console.warn('[draeger] serialport unavailable', e.message))
}

export const _parseMedibus = parseMedibus
