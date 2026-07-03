// Minimal MLLP framing — 0x0B <message> 0x1C 0x0D
import { createServer, Socket } from 'node:net'

const VT = 0x0b
const FS = 0x1c
const CR = 0x0d

export function startMllpServer(
  host: string,
  port: number,
  onMessage: (raw: string, socket: Socket) => void,
) {
  const server = createServer((socket) => {
    let buf = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      let start = buf.indexOf(VT)
      while (start !== -1) {
        const end = buf.indexOf(FS, start)
        if (end === -1) break
        const msg = buf.slice(start + 1, end).toString('utf8')
        buf = buf.slice(end + 2) // FS + CR
        try {
          onMessage(msg, socket)
        } catch (e) {
          console.error('[mllp] parse error', e)
        }
        start = buf.indexOf(VT)
      }
    })
    socket.on('error', (e) => console.error('[mllp] socket error', e.message))
  })
  server.listen(port, host, () => console.log(`[mllp] listening on ${host}:${port}`))
  return server
}

export function ackForMessage(raw: string): Buffer {
  // Extract MSH-10 (control ID) for the ACK
  const msh = raw.split(/\r|\n/)[0] ?? ''
  const fields = msh.split('|')
  const controlId = fields[9] ?? Date.now().toString()
  const now = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)
  const ack = `MSH|^~\\&|DOC_O_CLOCK|BRIDGE|SENDER|FACILITY|${now}||ACK|${controlId}|P|2.4\rMSA|AA|${controlId}\r`
  return Buffer.concat([Buffer.from([VT]), Buffer.from(ack, 'utf8'), Buffer.from([FS, CR])])
}
