/**
 * HL7 v2.x Message Parser for LIS Integration
 * Supports ORU^R01 (unsolicited lab results) - the most common LIS message type.
 * 
 * HL7 message structure:
 * MSH|^~\&|SENDING_APP|SENDING_FAC|RECEIVING_APP|RECEIVING_FAC|TIMESTAMP||ORU^R01|MSG_ID|P|2.5
 * PID|1||PATIENT_ID||LAST^FIRST||DOB|GENDER
 * OBR|1|SAMPLE_ID||TEST_CODE^TEST_NAME
 * OBX|1|NM|TEST_CODE^TEST_NAME||VALUE|UNIT|REF_RANGE|FLAG|||F
 */

export interface HL7ParsedResult {
  messageId: string;
  timestamp: string;
  patientId?: string;
  patientName?: string;
  sampleId?: string;
  testCode: string;
  testName?: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: string;
  resultTimestamp?: string;
}

export function parseHL7ORU(message: string): HL7ParsedResult[] {
  const results: HL7ParsedResult[] = [];
  const segments = message.split(/\r?\n|\r/).filter(s => s.trim());
  
  let msh: Record<string, string> = {};
  let pid: Record<string, string> = {};
  let obr: Record<string, string> = {};
  
  for (const segment of segments) {
    const fields = segment.split('|');
    const segType = fields[0];
    
    switch (segType) {
      case 'MSH':
        // MSH is special - field separator is field[1], so indices shift
        msh = {
          messageId: fields[9] || '',
          timestamp: fields[6] || '',
        };
        break;
        
      case 'PID':
        // PID-3: Patient ID, PID-5: Patient Name (LAST^FIRST), PID-7: DOB, PID-8: Gender
        pid = {
          patientId: fields[3]?.split('^')[0] || '',
          patientName: fields[5]?.replace(/\^/g, ' ') || '',
        };
        break;
        
      case 'OBR':
        // OBR-3: Sample/Placer Order Number, OBR-4: Test Code^Test Name
        const testParts = (fields[4] || '').split('^');
        obr = {
          sampleId: fields[3] || '',
          testCode: testParts[0] || '',
          testName: testParts[1] || testParts[0] || '',
        };
        break;
        
      case 'OBX':
        // OBX-3: Test Code^Test Name, OBX-5: Value, OBX-6: Unit
        // OBX-7: Reference Range, OBX-8: Abnormal Flag, OBX-14: Timestamp
        const obxTestParts = (fields[3] || '').split('^');
        results.push({
          messageId: msh.messageId,
          timestamp: msh.timestamp,
          patientId: pid.patientId,
          patientName: pid.patientName,
          sampleId: obr.sampleId,
          testCode: obxTestParts[0] || obr.testCode,
          testName: obxTestParts[1] || obxTestParts[0] || obr.testName,
          resultValue: fields[5] || '',
          unit: fields[6] || '',
          referenceRange: fields[7] || '',
          abnormalFlag: fields[8] || '',
          resultTimestamp: fields[14] || msh.timestamp,
        });
        break;
    }
  }
  
  return results;
}

/**
 * Parse ASTM E1381/E1394 message (alternative lab protocol)
 * Common in older analyzers.
 */
export function parseASTM(message: string): HL7ParsedResult[] {
  // ASTM uses different framing but similar concepts
  // This is a simplified parser - real implementation needs ENQ/ACK/NAK handling
  const results: HL7ParsedResult[] = [];
  
  // ASTM records start with record type identifier
  const lines = message.split(/\r?\n/).filter(l => l.trim());
  
  let currentSample = '';
  let currentPatient = '';
  
  for (const line of lines) {
    const recordType = line.charAt(0);
    const fields = line.substring(1).split('|');
    
    switch (recordType) {
      case 'P': // Patient record
        currentPatient = fields[3] || '';
        break;
      case 'O': // Order record
        currentSample = fields[2] || '';
        break;
      case 'R': // Result record
        // R|seq|test_code|value|unit|ref_range|flag
        results.push({
          messageId: `ASTM-${Date.now()}`,
          timestamp: new Date().toISOString(),
          patientId: currentPatient,
          sampleId: currentSample,
          testCode: fields[2] || '',
          testName: fields[2] || '',
          resultValue: fields[3] || '',
          unit: fields[4] || '',
          referenceRange: fields[5] || '',
          abnormalFlag: fields[6] || '',
        });
        break;
    }
  }
  
  return results;
}

/**
 * Map machine test code to internal test_type using machine's test_mapping
 */
export function mapTestCode(
  machineCode: string,
  testMapping: Record<string, string>
): string | null {
  // Direct mapping
  if (testMapping[machineCode]) {
    return testMapping[machineCode];
  }
  // Case-insensitive
  const lowerCode = machineCode.toLowerCase();
  for (const [key, value] of Object.entries(testMapping)) {
    if (key.toLowerCase() === lowerCode) {
      return value;
    }
  }
  return null;
}

/**
 * Supported LIS machine manufacturers and models (from Danphe list)
 */
export const SUPPORTED_MACHINES = [
  { manufacturer: 'Randox', models: ['RX Daytona+', 'RX Imola', 'RX Modena'] },
  { manufacturer: 'Sysmex', models: ['XN-330', 'XN-350', 'XN-1000', 'XS-1000i'] },
  { manufacturer: 'Mindray', models: ['BC-5000', 'BC-6000', 'CL-1000i'] },
  { manufacturer: 'Snibe', models: ['Maglumi X3', 'Maglumi 1000', 'Maglumi 2000', 'Maglumi X8', 'Biossays 240'] },
  { manufacturer: 'Horiba', models: ['Pentra XLR', 'Micros 60', 'YP8'] },
  { manufacturer: 'Abbott', models: ['Alinity', 'Cell-Dyn'] },
  { manufacturer: 'Siemens', models: ['Atellica', 'ADVIA'] },
  { manufacturer: 'Roche', models: ['Cobas', 'Elecsys'] },
  { manufacturer: 'Beckman', models: ['DxH 500', 'DxH 560', 'AU480'] },
  { manufacturer: 'Erba', models: ['XL 200', 'XL 640', 'XL 1000'] },
  { manufacturer: 'Diatron', models: ['P500', 'P70'] },
  { manufacturer: 'Medonic', models: ['M51'] },
];
