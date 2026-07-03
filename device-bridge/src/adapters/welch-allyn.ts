// Welch Allyn Connex VSM 6000 / Spot LXi — HL7 v2.4 ORU^R01 over MLLP for the
// WiFi gateway. Bluetooth pairing is handled by the Connex Central Station,
// which then forwards HL7 to this listener.
import { startMllpServer, ackForMessage } from '../mllp.js'
import { parseOru, extractPatientId } from '../hl7.js'
import type { DeviceConfig, CanonicalReading } from '../types.js'

export function startWelchAllyn(device: DeviceConfig, emit: (r: CanonicalReading) => void) {
  const port = device.listen_port ?? 3004
  startMllpServer(process.env.BIND_HOST ?? '0.0.0.0', port, (raw, socket) => {
    const pid = extractPatientId(raw)
    for (const r of parseOru(raw, device.id, pid)) emit(r)
    socket.write(ackForMessage(raw))
  })
}
