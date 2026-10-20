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
        // OBR-2: Placer Order Number (sample ID in most LIS setups)
        // OBR-3: Filler Order Number, OBR-4: Test Code^Test Name
        const testParts = (fields[4] || '').split('^');
        obr = {
          sampleId: fields[3] || fields[2] || '',
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
  // One ID per message (not per result, and unique even within the same millisecond)
  const messageId = `ASTM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
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
          messageId,
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
 * Supported LIS machine manufacturers and models
 * Comprehensive list covering Danphe, MocDoc, Insta HMS (Practo), and Epic (Beaker) compatible analyzers.
 * All communicate via HL7 v2.x or ASTM E1381/E1394 — the parser handles both.
 */
export const SUPPORTED_MACHINES = [
  { manufacturer: 'Abbott', models: ['Alinity c', 'Alinity h', 'Alinity i', 'Alinity i (immunoassay)', 'Alinity m', 'Architect c4000', 'Architect c8000', 'Architect i1000', 'Architect i1000SR', 'Architect i2000', 'Architect i2000SR', 'CELL-DYN Emerald', 'CELL-DYN Ruby', 'CELL-DYN Sapphire', 'm2000 RealTime'] },
  { manufacturer: 'Alifax', models: ['Roller 20', 'Test 1'] },
  { manufacturer: 'Arkray', models: ['Aution Eleven', 'Aution Max AX-4280'] },
  { manufacturer: 'BD', models: ['BACTEC 9000', 'BACTEC FX', 'Bruker MALDI', 'Phoenix 100', 'Phoenix M50'] },
  { manufacturer: 'Beckman Coulter', models: ['AU2700', 'AU480', 'AU5800', 'AU680', 'AcT 5diff', 'Access 2', 'DxC 500i', 'DxC 700 AU', 'DxH 500', 'DxH 560', 'DxH 800', 'DxH 900', 'MicroScan WalkAway', 'MicroScan autoSCAN-4', 'UniCel DxI 600', 'UniCel DxI 800'] },
  { manufacturer: 'Cepheid', models: ['GeneXpert', 'GeneXpert Infinity', 'GeneXpert Xpress'] },
  { manufacturer: 'Diasorin', models: ['Liaison', 'Liaison XL', 'Liaison XS'] },
  { manufacturer: 'Diatron', models: ['P500', 'P70', 'P780'] },
  { manufacturer: 'Diesse', models: ['Ves-Matic Cube 30', 'Ves-Matic Cube 80'] },
  { manufacturer: 'Dymind', models: ['DH36', 'DH51', 'DH76'] },
  { manufacturer: 'Erba', models: ['EM 360', 'Elite 580', 'H360', 'H560', 'XL 1000', 'XL 200', 'XL 300', 'XL 640'] },
  { manufacturer: 'Hologic', models: ['Aptima', 'Panther', 'Panther Fusion'] },
  { manufacturer: 'Horiba', models: ['ABX Micros', 'Micros 60', 'Micros ES60', 'Pentra 80', 'Pentra XLR'] },
  { manufacturer: 'Human', models: ['HumaStar 200', 'HumaStar 300', 'HumaStar 600'] },
  { manufacturer: 'Medonic', models: ['M32', 'M51'] },
  { manufacturer: 'Mindray', models: ['BC-2800', 'BC-3000', 'BC-5000', 'BC-5100', 'BC-6000', 'BC-6800', 'BS-200', 'BS-240', 'BS-360E', 'BS-480', 'BS-600M', 'BS-800', 'CL-1000i', 'CL-1200i', 'CL-2000i', 'CL-6000i', 'CL-900i'] },
  { manufacturer: 'Nihon Kohden', models: ['Celltac Alpha', 'Celltac G', 'MEK-9100'] },
  { manufacturer: 'Nova Biomedical', models: ['Stat Profile Prime', 'StatSensor'] },
  { manufacturer: 'Ortho Clinical', models: ['VITROS 250', 'VITROS 350', 'VITROS 4600', 'VITROS 5600', 'VITROS ECI', 'VITROS XT 7600'] },
  { manufacturer: 'Qiagen', models: ['NeuMoDx', 'QIAcube', 'QIAstat-Dx'] },
  { manufacturer: 'Radiometer', models: ['ABL800 FLEX', 'ABL9', 'ABL90 FLEX'] },
  { manufacturer: 'Randox', models: ['RX Daytona Plus', 'RX Daytona+', 'RX Imola', 'RX Modena', 'RX Monaco'] },
  { manufacturer: 'Roche', models: ['Cobas 4800', 'Cobas 6000', 'Cobas 6800', 'Cobas 8000', 'Cobas 8800', 'Cobas Pro', 'Cobas c311', 'Cobas c501', 'Cobas c702', 'Cobas e411', 'Cobas e601', 'Cobas e801', 'Cobas u 601', 'Cobas u 701', 'Elecsys 2010', 'LightCycler 480', 'Urisys 2400'] },
  { manufacturer: 'Selectra', models: ['Mach 5', 'Pro M', 'Pro S', 'Pro XS'] },
  { manufacturer: 'Siemens', models: ['ADVIA 1800', 'ADVIA 2400', 'ADVIA Centaur XP', 'ADVIA Centaur XPT', 'Atellica CH', 'Atellica IM', 'Atellica IM 1300', 'Atellica IM 1600', 'BCS XP', 'CLINITEK Advantus', 'CLINITEK Atlas', 'CLINITEK Novus', 'CS-5100 System', 'Dimension EXL', 'Dimension Vista', 'Immulite 2000', 'RAPIDLab 1200', 'RAPIDPoint 500', 'Sysmex CA-1500', 'epoc BGEM'] },
  { manufacturer: 'Snibe', models: ['Biossays 240 Plus', 'Maglumi 1000', 'Maglumi 2000', 'Maglumi 4000', 'Maglumi 800', 'Maglumi X3', 'Maglumi X8'] },
  { manufacturer: 'Stago', models: ['STA Compact', 'STA R Max', 'STA Satellite'] },
  { manufacturer: 'Sysmex', models: ['CA-600 series', 'CS-2000i', 'CS-5100', 'KX-21N', 'UF-1000i', 'UF-5000', 'UN-3000', 'XE-2100', 'XN-1000', 'XN-2000', 'XN-330', 'XN-350', 'XS-1000i', 'XT-4000i'] },
  { manufacturer: 'Thermo Fisher', models: ['Applied Biosystems 7500', 'Gallery', 'Indiko', 'Indiko Plus', 'Konelab 60', 'QuantStudio 5', 'QuantStudio 7'] },
  { manufacturer: 'Werfen', models: ['ACL TOP 350', 'ACL TOP 550', 'ACL TOP 750', 'GEM Premier', 'GEM Premier 3500', 'GEM Premier 4000', 'GEM Premier 5000'] },
  { manufacturer: 'bioMérieux', models: ['BACT/ALERT 3D', 'BacT/ALERT Virtuo', 'VIDAS', 'VIDAS 3', 'VITEK 2', 'VITEK MS', 'mini VIDAS'] },
];
