import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface MedicalRecord {
  id: string;
  patientId: string;
  recordType: 'diagnosis' | 'prescription' | 'lab_result' | 'imaging' | 'procedure' | 'note';
  data: any;
  providerId: string;
  timestamp: string;
  hash: string;
  previousHash?: string;
  signature: string;
  encrypted: boolean;
}

export interface ConsentRecord {
  id: string;
  patientId: string;
  providerId: string;
  dataTypes: string[];
  permissions: {
    read: boolean;
    write: boolean;
    share: boolean;
    delete: boolean;
  };
  purpose: string;
  expiryDate?: string;
  status: 'active' | 'revoked' | 'expired';
  consentHash: string;
  timestamp: string;
}

export interface BlockchainTransaction {
  id: string;
  type: 'record_creation' | 'consent_grant' | 'consent_revoke' | 'access_log';
  patientId: string;
  providerId?: string;
  recordId?: string;
  consentId?: string;
  hash: string;
  previousHash: string;
  timestamp: string;
  signature: string;
  merkleRoot: string;
}

export interface AccessLog {
  id: string;
  patientId: string;
  providerId: string;
  recordId: string;
  action: 'read' | 'write' | 'share' | 'delete';
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  consentId: string;
  success: boolean;
  reason?: string;
}

class BlockchainMedicalRecords {
  private blockchain: BlockchainTransaction[] = [];
  private encryptionKey: string = '';
  private merkleTree: Map<string, string> = new Map();

  constructor() {
    this.initializeBlockchain();
  }

  private async initializeBlockchain(): Promise<void> {
    try {
      await this.loadBlockchain();
      await this.generateEncryptionKey();
      await this.validateBlockchainIntegrity();

      logger.info('Blockchain medical records system initialized', 'BLOCKCHAIN');
    } catch (error) {
      errorHandler.handleError(error, 'initializeBlockchain');
    }
  }

  private async loadBlockchain(): Promise<void> {
    try {
      const { data: transactions } = await supabase
        .from('blockchain_transactions')
        .select('*')
        .order('timestamp', { ascending: true });

      if (transactions) {
        this.blockchain = transactions;
      }

      // Create genesis block if blockchain is empty
      if (this.blockchain.length === 0) {
        await this.createGenesisBlock();
      }
    } catch (error) {
      logger.error('Failed to load blockchain', 'BLOCKCHAIN', error);
    }
  }

  private async createGenesisBlock(): Promise<void> {
    const genesisBlock: BlockchainTransaction = {
      id: 'genesis',
      type: 'record_creation',
      patientId: 'system',
      hash: this.calculateHash('genesis', 'system', '', new Date().toISOString()),
      previousHash: '0',
      timestamp: new Date().toISOString(),
      signature: 'genesis_signature',
      merkleRoot: 'genesis_merkle'
    };

    this.blockchain.push(genesisBlock);
    
    await supabase.from('blockchain_transactions').insert(genesisBlock);
    logger.info('Genesis block created', 'BLOCKCHAIN');
  }

  private async generateEncryptionKey(): Promise<void> {
    // In production, this would use proper key management
    this.encryptionKey = await this.deriveKey('healthconnect_master_key');
  }

  private async deriveKey(seed: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private calculateHash(id: string, patientId: string, data: string, timestamp: string): string {
    const content = `${id}${patientId}${data}${timestamp}`;
    // Simplified hash - in production use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async encryptData(data: any): Promise<string> {
    // Simplified encryption - in production use proper encryption
    const jsonData = JSON.stringify(data);
    const encoded = btoa(jsonData);
    return encoded;
  }

  private async decryptData(encryptedData: string): Promise<any> {
    try {
      const decoded = atob(encryptedData);
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  async createMedicalRecord(
    patientId: string,
    providerId: string,
    recordType: MedicalRecord['recordType'],
    data: any
  ): Promise<MedicalRecord> {
    try {
      // Check consent
      const hasConsent = await this.checkConsent(patientId, providerId, 'write', recordType);
      if (!hasConsent) {
        throw new Error('No valid consent for creating this record');
      }

      // Encrypt sensitive data
      const encryptedData = await this.encryptData(data);
      
      const recordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      const hash = this.calculateHash(recordId, patientId, encryptedData, timestamp);
      
      const record: MedicalRecord = {
        id: recordId,
        patientId,
        recordType,
        data: encryptedData,
        providerId,
        timestamp,
        hash,
        previousHash: this.getLastBlockHash(),
        signature: await this.signRecord(hash, providerId),
        encrypted: true
      };

      // Store record
      await supabase.from('medical_records').insert(record);

      // Add to blockchain
      await this.addToBlockchain('record_creation', patientId, providerId, recordId);

      // Log access
      await this.logAccess(patientId, providerId, recordId, 'write', true);

      logger.info('Medical record created', 'BLOCKCHAIN', { recordId, patientId });
      return record;
    } catch (error) {
      errorHandler.handleError(error, 'createMedicalRecord');
      throw error;
    }
  }

  async getMedicalRecord(recordId: string, requesterId: string): Promise<MedicalRecord | null> {
    try {
      const { data: record } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (!record) {
        return null;
      }

      // Check consent
      const hasConsent = await this.checkConsent(record.patientId, requesterId, 'read', record.recordType);
      if (!hasConsent) {
        await this.logAccess(record.patientId, requesterId, recordId, 'read', false, 'No consent');
        throw new Error('No valid consent for accessing this record');
      }

      // Decrypt data if encrypted
      if (record.encrypted) {
        record.data = await this.decryptData(record.data);
      }

      // Log access
      await this.logAccess(record.patientId, requesterId, recordId, 'read', true);

      return record;
    } catch (error) {
      errorHandler.handleError(error, 'getMedicalRecord');
      throw error;
    }
  }

  async grantConsent(
    patientId: string,
    providerId: string,
    dataTypes: string[],
    permissions: ConsentRecord['permissions'],
    purpose: string,
    expiryDate?: string
  ): Promise<ConsentRecord> {
    try {
      const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      
      const consentData = {
        patientId,
        providerId,
        dataTypes,
        permissions,
        purpose,
        expiryDate,
        timestamp
      };
      
      const consentHash = this.calculateHash(consentId, patientId, JSON.stringify(consentData), timestamp);

      const consent: ConsentRecord = {
        id: consentId,
        patientId,
        providerId,
        dataTypes,
        permissions,
        purpose,
        expiryDate,
        status: 'active',
        consentHash,
        timestamp
      };

      // Store consent
      await supabase.from('consent_records').insert(consent);

      // Add to blockchain
      await this.addToBlockchain('consent_grant', patientId, providerId, undefined, consentId);

      logger.info('Consent granted', 'BLOCKCHAIN', { consentId, patientId, providerId });
      return consent;
    } catch (error) {
      errorHandler.handleError(error, 'grantConsent');
      throw error;
    }
  }

  async revokeConsent(consentId: string, patientId: string): Promise<void> {
    try {
      // Update consent status
      await supabase
        .from('consent_records')
        .update({ status: 'revoked' })
        .eq('id', consentId)
        .eq('patientId', patientId);

      // Add to blockchain
      await this.addToBlockchain('consent_revoke', patientId, undefined, undefined, consentId);

      logger.info('Consent revoked', 'BLOCKCHAIN', { consentId, patientId });
    } catch (error) {
      errorHandler.handleError(error, 'revokeConsent');
      throw error;
    }
  }

  private async checkConsent(
    patientId: string,
    providerId: string,
    action: 'read' | 'write' | 'share' | 'delete',
    dataType?: string
  ): Promise<boolean> {
    try {
      const { data: consents } = await supabase
        .from('consent_records')
        .select('*')
        .eq('patientId', patientId)
        .eq('providerId', providerId)
        .eq('status', 'active');

      if (!consents || consents.length === 0) {
        return false;
      }

      const now = new Date();
      const validConsents = consents.filter(consent => {
        // Check expiry
        if (consent.expiryDate && new Date(consent.expiryDate) < now) {
          return false;
        }

        // Check data type
        if (dataType && !consent.dataTypes.includes(dataType) && !consent.dataTypes.includes('all')) {
          return false;
        }

        // Check permission
        return consent.permissions[action] === true;
      });

      return validConsents.length > 0;
    } catch (error) {
      logger.error('Failed to check consent', 'BLOCKCHAIN', error);
      return false;
    }
  }

  private async addToBlockchain(
    type: BlockchainTransaction['type'],
    patientId: string,
    providerId?: string,
    recordId?: string,
    consentId?: string
  ): Promise<void> {
    try {
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      const previousHash = this.getLastBlockHash();
      
      const transactionData = {
        type,
        patientId,
        providerId,
        recordId,
        consentId,
        timestamp
      };
      
      const hash = this.calculateHash(transactionId, patientId, JSON.stringify(transactionData), timestamp);
      const merkleRoot = await this.calculateMerkleRoot([hash]);

      const transaction: BlockchainTransaction = {
        id: transactionId,
        type,
        patientId,
        providerId,
        recordId,
        consentId,
        hash,
        previousHash,
        timestamp,
        signature: await this.signTransaction(hash),
        merkleRoot
      };

      this.blockchain.push(transaction);
      await supabase.from('blockchain_transactions').insert(transaction);

      logger.info('Transaction added to blockchain', 'BLOCKCHAIN', { transactionId, type });
    } catch (error) {
      logger.error('Failed to add transaction to blockchain', 'BLOCKCHAIN', error);
    }
  }

  private getLastBlockHash(): string {
    if (this.blockchain.length === 0) {
      return '0';
    }
    return this.blockchain[this.blockchain.length - 1].hash;
  }

  private async signRecord(hash: string, providerId: string): Promise<string> {
    // Simplified signing - in production use proper digital signatures
    return `sig_${hash.substr(0, 8)}_${providerId}`;
  }

  private async signTransaction(hash: string): Promise<string> {
    // Simplified signing - in production use proper digital signatures
    return `tx_sig_${hash.substr(0, 8)}`;
  }

  private async calculateMerkleRoot(hashes: string[]): Promise<string> {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const newLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      const combined = this.calculateHash('merkle', left, right, '');
      newLevel.push(combined);
    }

    return this.calculateMerkleRoot(newLevel);
  }

  private async logAccess(
    patientId: string,
    providerId: string,
    recordId: string,
    action: AccessLog['action'],
    success: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const accessLog: AccessLog = {
        id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId,
        providerId,
        recordId,
        action,
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown', // Would be captured from request
        userAgent: navigator.userAgent,
        consentId: 'unknown', // Would be tracked from consent check
        success,
        reason
      };

      await supabase.from('access_logs').insert(accessLog);

      // Add to blockchain for audit trail
      await this.addToBlockchain('access_log', patientId, providerId, recordId);
    } catch (error) {
      logger.error('Failed to log access', 'BLOCKCHAIN', error);
    }
  }

  private async validateBlockchainIntegrity(): Promise<boolean> {
    try {
      for (let i = 1; i < this.blockchain.length; i++) {
        const currentBlock = this.blockchain[i];
        const previousBlock = this.blockchain[i - 1];

        // Validate hash chain
        if (currentBlock.previousHash !== previousBlock.hash) {
          logger.error('Blockchain integrity compromised', 'BLOCKCHAIN', {
            blockId: currentBlock.id,
            expectedPreviousHash: previousBlock.hash,
            actualPreviousHash: currentBlock.previousHash
          });
          return false;
        }

        // Validate block hash
        const calculatedHash = this.calculateHash(
          currentBlock.id,
          currentBlock.patientId,
          JSON.stringify({
            type: currentBlock.type,
            providerId: currentBlock.providerId,
            recordId: currentBlock.recordId,
            consentId: currentBlock.consentId
          }),
          currentBlock.timestamp
        );

        if (calculatedHash !== currentBlock.hash) {
          logger.error('Block hash validation failed', 'BLOCKCHAIN', {
            blockId: currentBlock.id,
            expectedHash: calculatedHash,
            actualHash: currentBlock.hash
          });
          return false;
        }
      }

      logger.info('Blockchain integrity validated', 'BLOCKCHAIN');
      return true;
    } catch (error) {
      logger.error('Blockchain validation failed', 'BLOCKCHAIN', error);
      return false;
    }
  }

  async getPatientRecords(patientId: string, requesterId: string): Promise<MedicalRecord[]> {
    try {
      // Check if requester has consent to access patient records
      const hasConsent = await this.checkConsent(patientId, requesterId, 'read');
      if (!hasConsent && patientId !== requesterId) {
        throw new Error('No valid consent for accessing patient records');
      }

      const { data: records } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patientId', patientId)
        .order('timestamp', { ascending: false });

      if (!records) return [];

      // Decrypt records
      const decryptedRecords = await Promise.all(
        records.map(async (record) => {
          if (record.encrypted) {
            record.data = await this.decryptData(record.data);
          }
          return record;
        })
      );

      // Log access
      await Promise.all(
        records.map(record =>
          this.logAccess(patientId, requesterId, record.id, 'read', true)
        )
      );

      return decryptedRecords;
    } catch (error) {
      errorHandler.handleError(error, 'getPatientRecords');
      throw error;
    }
  }

  async getConsentHistory(patientId: string): Promise<ConsentRecord[]> {
    try {
      const { data: consents } = await supabase
        .from('consent_records')
        .select('*')
        .eq('patientId', patientId)
        .order('timestamp', { ascending: false });

      return consents || [];
    } catch (error) {
      errorHandler.handleError(error, 'getConsentHistory');
      return [];
    }
  }

  async getAccessLogs(patientId: string, requesterId: string): Promise<AccessLog[]> {
    try {
      // Only patient or authorized providers can view access logs
      const hasConsent = await this.checkConsent(patientId, requesterId, 'read');
      if (!hasConsent && patientId !== requesterId) {
        throw new Error('No authorization to view access logs');
      }

      const { data: logs } = await supabase
        .from('access_logs')
        .select('*')
        .eq('patientId', patientId)
        .order('timestamp', { ascending: false })
        .limit(100);

      return logs || [];
    } catch (error) {
      errorHandler.handleError(error, 'getAccessLogs');
      return [];
    }
  }

  async generateComplianceReport(patientId: string): Promise<any> {
    try {
      const records = await this.getPatientRecords(patientId, patientId);
      const consents = await this.getConsentHistory(patientId);
      const accessLogs = await this.getAccessLogs(patientId, patientId);

      const report = {
        patientId,
        totalRecords: records.length,
        activeConsents: consents.filter(c => c.status === 'active').length,
        revokedConsents: consents.filter(c => c.status === 'revoked').length,
        totalAccesses: accessLogs.length,
        unauthorizedAttempts: accessLogs.filter(log => !log.success).length,
        dataTypes: [...new Set(records.map(r => r.recordType))],
        lastAccess: accessLogs[0]?.timestamp,
        blockchainIntegrity: await this.validateBlockchainIntegrity(),
        generatedAt: new Date().toISOString()
      };

      return report;
    } catch (error) {
      errorHandler.handleError(error, 'generateComplianceReport');
      return null;
    }
  }
}

export const blockchainMedicalRecords = new BlockchainMedicalRecords();
