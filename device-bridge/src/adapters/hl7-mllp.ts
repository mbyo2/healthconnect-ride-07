import { startMllpServer, ackForMessage } from '../mllp.js'
import { parseOru, extractPatientId } from '../hl7.js'
import type { DeviceConfig, CanonicalReading } from '../types.js'

export function startHl7Mllp(device: DeviceConfig, emit: (r: CanonicalReading) => void) {
  const port = device.listen_port ?? 2575
  startMllpServer(process.env.BIND_HOST ?? '0.0.0.0', port, (raw, socket) => {
    const patientId = extractPatientId(raw)
    for (const r of parseOru(raw, device.id, patientId)) emit(r)
    socket.write(ackForMessage(raw))
  })
}
