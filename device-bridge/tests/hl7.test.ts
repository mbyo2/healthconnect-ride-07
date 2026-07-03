import { describe, it, expect } from 'vitest'
import { parseOru, extractPatientId } from '../src/hl7.js'
import { _parseMedibus } from '../src/adapters/draeger-medibus.js'

const SAMPLE = [
  'MSH|^~\\&|MONITOR|ICU1|DOC|OC|20260703120000||ORU^R01|MSG001|P|2.4',
  'PID|1||11111111-1111-1111-1111-111111111111^^^HOSP^MR',
  'OBR|1|||VITALS',
  'OBX|1|NM|8867-4^Heart rate^LN||72|bpm|60-100|N|||F|||20260703120000',
  'OBX|2|NM|59408-5^SpO2^LN||88|%|95-100|L|||F|||20260703120000',
  'OBX|3|NM|8480-6^Systolic BP^LN||145|mmHg|90-140|H|||F|||20260703120000',
].join('\r')

describe('HL7 ORU parser', () => {
  it('extracts patient UUID from PID-3', () => {
    expect(extractPatientId(SAMPLE)).toBe('11111111-1111-1111-1111-111111111111')
  })

  it('parses OBX vitals into canonical readings', () => {
    const readings = parseOru(SAMPLE, 'dev-1', extractPatientId(SAMPLE))
    expect(readings).toHaveLength(3)
    expect(readings[0]).toMatchObject({
      device_id: 'dev-1',
      data_type: 'heart_rate',
      data_value: { value: 72 },
      unit: 'bpm',
      is_critical: false,
    })
  })

  it('flags out-of-range SpO2 as critical', () => {
    const readings = parseOru(SAMPLE, 'dev-1')
    const spo2 = readings.find((r) => r.data_type === 'spo2')!
    expect(spo2.is_critical).toBe(true)
    expect(spo2.alert?.severity).toBe('critical')
  })

  it('flags high systolic BP as critical', () => {
    const readings = parseOru(SAMPLE, 'dev-1')
    const sbp = readings.find((r) => r.data_type === 'systolic_bp')!
    expect(sbp.is_critical).toBe(true)
  })
})

describe('Dräger Medibus parser', () => {
  it('extracts heart_rate + spo2 from a numeric-data frame', () => {
    // Command 2400 + code 78 (HR) 000072 + code 50 (SpO2) 000098 + checksum 00
    const frame = '\x012400' + '78' + '   72' + '50' + '   98' + '00\r'
    const readings = _parseMedibus(frame, 'dev-2')
    expect(readings.map((r) => r.data_type).sort()).toEqual(['heart_rate', 'spo2'])
  })
})
