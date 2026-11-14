// Dräger Medibus / Medibus.X — serial protocol. Frames are ASCII with a
// SOH (0x01) start and a CR (0x0d) end. Numeric data-block replies are a run
// of records: a two-hex-digit code followed by the measured value, space-
// padded and right-justified. The value field is NOT a fixed width — the
// Dräger spec gives each code its own format (e.g. `_XXX`, `XXX_`, `XX.X`,
// `XXXX`, `_` = space), so a fixed 8-char stride (2-char code + 6-char value)
// misaligns on devices that send narrower values and silently drops every
// record after the first (the 2nd record's code then lands mid-value and is
// skipped as unknown). Instead we score each candidate record width 8 down
// to 5 (value widths 6 down to 3, 8 first to keep spec-conformant 6-char
// frames on the old path): a width counts only if the payload splits exactly
// into records whose non-blank value fields are all numeric, and the best
// score is the most known-code readings yielded. A blank value field (the
// device has no reading for that code) skips just that record.
import type { DeviceConfig, CanonicalReading } from '../types.js'

const NUMERIC_VALUE = /^-?\d+(\.\d+)?$/

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
  // Score every candidate width and keep the best parse: a width only counts
  // if the payload splits exactly into records whose non-blank value fields
  // are all numeric, and the score is the number of known-code readings it
  // yields. Ties keep the wider width (8 tried first). A blank value field
  // (device has no reading for that code) skips that record without
  // invalidating the width; an unknown code is skipped, as before.
  let best: CanonicalReading[] | null = null
  for (let width = 8; width >= 5; width--) {
    if (payload.length === 0 || payload.length % width !== 0) continue
    const records: { code: string; value: string }[] = []
    let aligned = true
    for (let i = 0; i + width <= payload.length; i += width) {
      const code = payload.slice(i, i + 2)
      const value = payload.slice(i + 2, i + width).replace(/\s+/g, '')
      if (value !== '' && !NUMERIC_VALUE.test(value)) {
        aligned = false
        break
      }
      records.push({ code, value })
    }
    if (!aligned || records.length === 0) continue
    const out: CanonicalReading[] = []
    for (const { code, value } of records) {
      if (value === '') continue
      const meta = MEDIBUS_CODES[code]
      if (!meta) continue
      out.push({
        device_id: deviceId,
        data_type: meta.data_type,
        data_value: { value: Number.parseFloat(value) },
        unit: meta.unit ?? null,
        recorded_at: new Date().toISOString(),
      })
    }
    if (best === null || out.length > best.length) best = out
  }
  return best ?? []
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
