import type { CanonicalReading } from './types.js'

export async function forward(
  config: { ingestUrl: string; institutionId: string; bridgeToken: string },
  readings: CanonicalReading[],
) {
  const res = await fetch(config.ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-institution-id': config.institutionId,
      'x-bridge-token': config.bridgeToken,
    },
    body: JSON.stringify({ institution_id: config.institutionId, readings }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ingest ${res.status}: ${body}`)
  }
  return res.json()
}
