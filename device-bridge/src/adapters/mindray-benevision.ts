// Mindray BeneVision N-series central station + bedside monitors — export
// HL7 v2.4 ORU^R01 over MLLP.
import { startMllpServer, ackForMessage } from '../mllp.js'
import { parseOru, extractPatientId } from '../hl7.js'
import type { DeviceConfig, CanonicalReading } from '../types.js'

export function startMindrayBenevision(device: DeviceConfig, emit: (r: CanonicalReading) => void) {
  const port = device.listen_port ?? 3003
  startMllpServer(process.env.BIND_HOST ?? '0.0.0.0', port, (raw, socket) => {
    const pid = extractPatientId(raw)
    for (const r of parseOru(raw, device.id, pid)) emit(r)
    socket.write(ackForMessage(raw))
  })
}
