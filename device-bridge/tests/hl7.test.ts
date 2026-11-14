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

  it('systolic boundary: 140 is not critical, 141 is', () => {
    // ACC/AHA Stage 2 hypertension starts at 140; the alert band is [90, 140].
    const oruWithSbp = (sbp: number) =>
      [
        'MSH|^~\\&|MONITOR|ICU1|DOC|OC|20260703120000||ORU^R01|MSG001|P|2.4',
        'OBX|1|NM|8480-6^Systolic BP^LN||' + sbp + '|mmHg|90-140|H|||F',
      ].join('\r')
    const at140 = parseOru(oruWithSbp(140), 'dev-1').find((r) => r.data_type === 'systolic_bp')!
    const at141 = parseOru(oruWithSbp(141), 'dev-1').find((r) => r.data_type === 'systolic_bp')!
    expect(at140.is_critical).toBe(false)
    expect(at141.is_critical).toBe(true)
  })

  it('diastolic boundary: 90 is not critical, 91 is', () => {
    // ACC/AHA Stage 2 hypertension starts at 90; the alert band is [50, 90].
    // (Strict check, same as systolic: the threshold value itself is safe.)
    const oruWithDbp = (dbp: number) =>
      [
        'MSH|^~\\&|MONITOR|ICU1|DOC|OC|20260703120000||ORU^R01|MSG001|P|2.4',
        'OBX|1|NM|8462-4^Diastolic BP^LN||' + dbp + '|mmHg|50-90|H|||F',
      ].join('\r')
    const at90 = parseOru(oruWithDbp(90), 'dev-1').find((r) => r.data_type === 'diastolic_bp')!
    const at91 = parseOru(oruWithDbp(91), 'dev-1').find((r) => r.data_type === 'diastolic_bp')!
    expect(at90.is_critical).toBe(false)
    expect(at91.is_critical).toBe(true)
  })
})

describe('Dräger Medibus parser', () => {
  it('extracts heart_rate + spo2 from a numeric-data frame', () => {
    // Command 2400 + code 78 (HR) 000072 + code 50 (SpO2) 000098 + checksum 00
    const frame = '\x012400' + '78' + '   72' + '50' + '   98' + '00\r'
    const readings = _parseMedibus(frame, 'dev-2')
    expect(readings.map((r) => r.data_type).sort()).toEqual(['heart_rate', 'spo2'])
  })

  it('extracts heart_rate + spo2 from a 6-char-value frame (old stride)', () => {
    // Same frame with spec-style 6-char right-justified values — the
    // width-detecting parser must keep handling these, not just 5-char ones.
    const frame = '\x012400' + '78' + '    72' + '50' + '    98' + '00\r'
    const readings = _parseMedibus(frame, 'dev-2')
    expect(readings.map((r) => r.data_type).sort()).toEqual(['heart_rate', 'spo2'])
    expect(readings.find((r) => r.data_type === 'spo2')!.data_value).toEqual({ value: 98 })
  })

  it('keeps the valid reading when another code has a blank value', () => {
    const frame = '\x012400' + '78' + '   72' + '50' + '     ' + '00\r'
    const readings = _parseMedibus(frame, 'dev-2')
    expect(readings.map((r) => r.data_type)).toEqual(['heart_rate'])
    expect(readings[0].data_value).toEqual({ value: 72 })
  })
})
