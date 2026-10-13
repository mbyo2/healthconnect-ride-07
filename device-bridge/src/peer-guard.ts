import type { Socket } from 'node:net'

// Deny-by-default source-address allowlist for TCP device listeners.
// Allowed = device.allowed_ips + BRIDGE_ALLOWED_IPS (comma-separated).
export function buildAllowlist(deviceIps?: string[]): Set<string> {
  const env = (process.env.BRIDGE_ALLOWED_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return new Set([...(deviceIps ?? []), ...env].map(normalize))
}

function normalize(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip
}

export function rejectUnlessAllowed(socket: Socket, allow: Set<string>, tag: string): boolean {
  const peer = normalize(socket.remoteAddress ?? '')
  if (!peer || !allow.has(peer)) {
    console.warn(`[${tag}] rejected connection from ${peer || 'unknown'} (not in allowlist)`)
    socket.destroy()
    return true
  }
  return false
}
