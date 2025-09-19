import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Lock, 
  Unlock, 
  FileText, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Key,
  Database,
  History,
  Eye,
  EyeOff,
  Download,
  Upload
} from 'lucide-react';
import { blockchainMedicalRecords } from '@/utils/blockchain-medical-records';

interface BlockchainMedicalRecordsProps {
  patientId: string;
  userRole: 'patient' | 'doctor' | 'nurse' | 'admin';
}

interface MedicalRecord {
  id: string;
  patientId: string;
  providerId: string;
  recordType: string;
  data: any;
  timestamp: string;
  hash: string;
  signature: string;
  encrypted: boolean;
}

interface ConsentRecord {
  id: string;
  patientId: string;
  providerId: string;
  permissions: string[];
  expiresAt: string;
  grantedAt: string;
  status: 'active' | 'revoked' | 'expired';
}

export const BlockchainMedicalRecords: React.FC<BlockchainMedicalRecordsProps> = ({ 
  patientId, 
  userRole 
}) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [newRecordData, setNewRecordData] = useState('');
  const [newRecordType, setNewRecordType] = useState('lab_result');
  const [providerId, setProviderId] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [expiryDate, setExpiryDate] = useState('');
  const [blockchainStatus, setBlockchainStatus] = useState<any>(null);

  useEffect(() => {
    loadBlockchainData();
  }, [patientId]);

  const loadBlockchainData = async () => {
    try {
      setLoading(true);

      // Load patient records
      const patientRecords = await blockchainMedicalRecords.getPatientRecords(patientId);
      setRecords(patientRecords || []);

      // Load consent records
      const patientConsents = await blockchainMedicalRecords.getPatientConsents(patientId);
      setConsents(patientConsents || []);

      // Load audit trail
      const audit = await blockchainMedicalRecords.getAuditTrail(patientId);
      setAuditTrail(audit || []);

      // Get blockchain status
      const status = await blockchainMedicalRecords.validateBlockchainIntegrity();
      setBlockchainStatus(status);

    } catch (error) {
      console.error('Failed to load blockchain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const storeNewRecord = async () => {
    if (!newRecordData.trim() || !providerId.trim()) {
      alert('Please provide record data and provider ID');
      return;
    }

    try {
      setLoading(true);
      
      const recordData = {
        type: newRecordType,
        data: JSON.parse(newRecordData),
        notes: 'Record stored via blockchain interface'
      };

      const recordId = await blockchainMedicalRecords.storeRecord(
        patientId,
        recordData,
        providerId
      );

      if (recordId) {
        alert('Record stored successfully on blockchain');
        setNewRecordData('');
        setProviderId('');
        await loadBlockchainData();
      }
    } catch (error) {
      console.error('Failed to store record:', error);
      alert('Failed to store record. Please check the data format.');
    } finally {
      setLoading(false);
    }
  };

  const grantConsent = async () => {
    if (!providerId.trim() || permissions.length === 0) {
      alert('Please provide provider ID and select permissions');
      return;
    }

    try {
      setLoading(true);

      const consent = await blockchainMedicalRecords.grantConsent(
        patientId,
        providerId,
        permissions,
        expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      );

      if (consent) {
        alert('Consent granted successfully');
        setProviderId('');
        setPermissions(['read']);
        setExpiryDate('');
        await loadBlockchainData();
      }
    } catch (error) {
      console.error('Failed to grant consent:', error);
      alert('Failed to grant consent');
    } finally {
      setLoading(false);
    }
  };

  const revokeConsent = async (consentId: string) => {
    try {
      setLoading(true);
      
      const success = await blockchainMedicalRecords.revokeConsent(patientId, consentId);
      
      if (success) {
        alert('Consent revoked successfully');
        await loadBlockchainData();
      }
    } catch (error) {
      console.error('Failed to revoke consent:', error);
      alert('Failed to revoke consent');
    } finally {
      setLoading(false);
    }
  };

  const viewRecord = async (record: MedicalRecord) => {
    try {
      // Check if user has permission to view this record
      const hasPermission = await blockchainMedicalRecords.validateConsent(
        patientId,
        record.providerId,
        'read'
      );

      if (hasPermission || userRole === 'patient') {
        setSelectedRecord(record);
      } else {
        alert('You do not have permission to view this record');
      }
    } catch (error) {
      console.error('Failed to validate permissions:', error);
      alert('Permission validation failed');
    }
  };

  const downloadRecord = async (record: MedicalRecord) => {
    try {
      const recordData = JSON.stringify(record, null, 2);
      const blob = new Blob([recordData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-record-${record.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download record:', error);
    }
  };

  const getPermissionBadgeColor = (permission: string) => {
    switch (permission) {
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'write': return 'bg-green-100 text-green-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'revoked': return 'text-red-600';
      case 'expired': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-6 h-6 mr-2 text-green-600" />
            Blockchain Medical Records
          </CardTitle>
          <CardDescription>
            Secure, immutable medical record storage with patient consent management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blockchainStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {blockchainStatus.totalRecords || 0}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {blockchainStatus.validHashes || 0}
                </div>
                <div className="text-sm text-gray-600">Valid Hashes</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${blockchainStatus.integrityValid ? 'text-green-600' : 'text-red-600'}`}>
                  {blockchainStatus.integrityValid ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Blockchain Integrity</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="store">Store New Record</TabsTrigger>
        </TabsList>

        {/* Medical Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Medical Records ({records.length})
              </CardTitle>
              <CardDescription>
                Blockchain-secured medical records with cryptographic verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${record.encrypted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <div>
                          <h4 className="font-semibold">{record.recordType.replace('_', ' ').toUpperCase()}</h4>
                          <p className="text-sm text-gray-600">
                            Provider: {record.providerId} • {new Date(record.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="flex items-center">
                          {record.encrypted ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                          {record.encrypted ? 'Encrypted' : 'Plain'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewRecord(record)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadRecord(record)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Hash:</strong> <code className="bg-gray-100 px-1 rounded">{record.hash.substring(0, 20)}...</code></p>
                      <p><strong>Signature:</strong> <code className="bg-gray-100 px-1 rounded">{record.signature.substring(0, 20)}...</code></p>
                    </div>
                  </div>
                ))}
                
                {records.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No medical records found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Record Details Modal */}
          {selectedRecord && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Record Details</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>
                    <EyeOff className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Record ID</Label>
                      <p className="font-mono text-sm">{selectedRecord.id}</p>
                    </div>
                    <div>
                      <Label>Record Type</Label>
                      <p>{selectedRecord.recordType}</p>
                    </div>
                    <div>
                      <Label>Provider ID</Label>
                      <p>{selectedRecord.providerId}</p>
                    </div>
                    <div>
                      <Label>Timestamp</Label>
                      <p>{new Date(selectedRecord.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label>Record Data</Label>
                    <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-64">
                      {JSON.stringify(selectedRecord.data, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <Label>Cryptographic Hash</Label>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all">{selectedRecord.hash}</p>
                  </div>
                  
                  <div>
                    <Label>Digital Signature</Label>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all">{selectedRecord.signature}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Consent Management Tab */}
        <TabsContent value="consent" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grant New Consent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Grant Consent
                </CardTitle>
                <CardDescription>
                  Grant healthcare providers access to your medical records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="providerId">Provider ID</Label>
                  <Input
                    id="providerId"
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    placeholder="healthcare-provider-123"
                  />
                </div>
                
                <div>
                  <Label>Permissions</Label>
                  <div className="space-y-2 mt-2">
                    {['read', 'write', 'delete', 'admin'].map((perm) => (
                      <label key={perm} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPermissions([...permissions, perm]);
                            } else {
                              setPermissions(permissions.filter(p => p !== perm));
                            }
                          }}
                        />
                        <span className="capitalize">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="expiryDate"
                    type="datetime-local"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                
                <Button onClick={grantConsent} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Grant Consent
                </Button>
              </CardContent>
            </Card>

            {/* Active Consents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Active Consents ({consents.filter(c => c.status === 'active').length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {consents.map((consent) => (
                    <div key={consent.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{consent.providerId}</p>
                          <p className="text-sm text-gray-600">
                            Granted: {new Date(consent.grantedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(consent.status)}>
                            {consent.status}
                          </Badge>
                          {consent.status === 'active' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeConsent(consent.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {consent.permissions.map((perm, index) => (
                          <Badge key={index} className={getPermissionBadgeColor(perm)}>
                            {perm}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Expires: {new Date(consent.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  
                  {consents.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-600">No consent records found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2" />
                Blockchain Audit Trail
              </CardTitle>
              <CardDescription>
                Complete history of all blockchain transactions and access events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditTrail.map((event, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.action}</p>
                        <p className="text-sm text-gray-600">
                          {event.actor} • {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {event.type}
                      </Badge>
                    </div>
                    {event.details && (
                      <p className="text-sm text-gray-700 mt-1">{event.details}</p>
                    )}
                  </div>
                ))}
                
                {auditTrail.length === 0 && (
                  <div className="text-center py-8">
                    <History className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No audit trail events found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store New Record Tab */}
        <TabsContent value="store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Store New Medical Record
              </CardTitle>
              <CardDescription>
                Add a new medical record to the blockchain with cryptographic security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recordType">Record Type</Label>
                  <select
                    id="recordType"
                    value={newRecordType}
                    onChange={(e) => setNewRecordType(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="lab_result">Lab Result</option>
                    <option value="prescription">Prescription</option>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="imaging">Medical Imaging</option>
                    <option value="vital_signs">Vital Signs</option>
                    <option value="consultation">Consultation Notes</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="newProviderId">Provider ID</Label>
                  <Input
                    id="newProviderId"
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    placeholder="healthcare-provider-123"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="recordData">Record Data (JSON Format)</Label>
                <textarea
                  id="recordData"
                  value={newRecordData}
                  onChange={(e) => setNewRecordData(e.target.value)}
                  placeholder='{"glucose": 95, "cholesterol": 180, "notes": "Normal levels"}'
                  className="w-full p-3 border rounded-md h-32 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter valid JSON data for the medical record
                </p>
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Security Notice</AlertTitle>
                <AlertDescription>
                  This record will be encrypted, hashed, and digitally signed before being stored on the blockchain. 
                  Once stored, it cannot be modified or deleted.
                </AlertDescription>
              </Alert>
              
              <Button onClick={storeNewRecord} className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Storing on Blockchain...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Store on Blockchain
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
