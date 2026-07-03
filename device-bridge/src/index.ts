// CLI entry — loads config, spins up one listener per device, forwards
// normalized readings to Doc'O Clock's device-bridge-ingest edge function.
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { loadConfig } from './config.js'
import { forward } from './ingest.js'
import { startHl7Mllp } from './adapters/hl7-mllp.js'
import { startPhilipsIntellivue } from './adapters/philips-intellivue.js'
import { startGeCarescape } from './adapters/ge-carescape.js'
import { startDraegerMedibus } from './adapters/draeger-medibus.js'
import { startNihonKohden } from './adapters/nihon-kohden.js'
import { startMindrayBenevision } from './adapters/mindray-benevision.js'
import { startWelchAllyn } from './adapters/welch-allyn.js'
import type { DeviceConfig, CanonicalReading } from './types.js'

const ADAPTERS: Record<string, (d: DeviceConfig, emit: (r: CanonicalReading) => void) => void> = {
  'hl7-mllp': startHl7Mllp,
  philips: startPhilipsIntellivue,
  ge: startGeCarescape,
  draeger: startDraegerMedibus,
  'nihon-kohden': startNihonKohden,
  mindray: startMindrayBenevision,
  'welch-allyn': startWelchAllyn,
}

async function main() {
  const config = loadConfig()
  const manifest = JSON.parse(readFileSync(config.devicesFile, 'utf8')) as {
    devices: DeviceConfig[]
  }

  const buffer: CanonicalReading[] = []
  const flush = async () => {
    if (!buffer.length) return
    const batch = buffer.splice(0, buffer.length)
    try {
      await forward(config, batch)
      console.log(`[bridge] forwarded ${batch.length} readings`)
    } catch (e) {
      console.error('[bridge] forward failed, re-queueing', e)
      buffer.unshift(...batch)
    }
  }
  setInterval(flush, 2000)

  for (const device of manifest.devices) {
    const start = ADAPTERS[device.brand] ?? ADAPTERS['hl7-mllp']
    console.log(`[bridge] starting ${device.brand} adapter for ${device.name}`)
    start(device, (reading) => buffer.push(reading))
  }

  console.log(`[bridge] running, ${manifest.devices.length} device(s) attached`)
}

main().catch((e) => {
  console.error('[bridge] fatal', e)
  process.exit(1)
})
