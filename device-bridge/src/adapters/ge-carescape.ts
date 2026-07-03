// GE CARESCAPE B450/B650/B850 — exports vitals over Unity Network as HL7 v2.4
// ORU^R01, delivered over MLLP on TCP.
import { startMllpServer, ackForMessage } from '../mllp.js'
import { parseOru, extractPatientId } from '../hl7.js'
import type { DeviceConfig, CanonicalReading } from '../types.js'

export function startGeCarescape(device: DeviceConfig, emit: (r: CanonicalReading) => void) {
  const port = device.listen_port ?? 3001
  startMllpServer(process.env.BIND_HOST ?? '0.0.0.0', port, (raw, socket) => {
    const pid = extractPatientId(raw)
    for (const r of parseOru(raw, device.id, pid)) emit(r)
    socket.write(ackForMessage(raw))
  })
}
