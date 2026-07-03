export interface BridgeConfig {
  ingestUrl: string
  institutionId: string
  bridgeToken: string
  devicesFile: string
  bindHost: string
}

export function loadConfig(): BridgeConfig {
  const ingestUrl = process.env.DOC_O_CLOCK_INGEST_URL
  const institutionId = process.env.INSTITUTION_ID
  const bridgeToken = process.env.BRIDGE_TOKEN
  if (!ingestUrl || !institutionId || !bridgeToken) {
    throw new Error(
      'Missing env: DOC_O_CLOCK_INGEST_URL, INSTITUTION_ID, BRIDGE_TOKEN must all be set',
    )
  }
  return {
    ingestUrl,
    institutionId,
    bridgeToken,
    devicesFile: process.env.DEVICES_FILE ?? './devices.json',
    bindHost: process.env.BIND_HOST ?? '0.0.0.0',
  }
}
