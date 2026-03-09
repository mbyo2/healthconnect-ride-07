import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Send, Clock, CheckCircle, XCircle, AlertTriangle, 
  Plus, Loader2, RefreshCw, DollarSign, Building2, User
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface InsuranceClaim {
  id: string;
  institution_id: string;
  invoice_id: string | null;
  patient_id: string | null;
  patient_name: string;
  insurance_provider: string;
  policy_number: string;
  claim_number: string;
  claim_type: 'pre_authorization' | 'submission' | 'reimbursement';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'denied' | 'appealed';
  claimed_amount: number;
  approved_amount: number | null;
  denial_reason: string | null;
  supporting_documents: string[];
  diagnosis_codes: string[];
  procedure_codes: string[];
  service_date: string;
  submission_date: string | null;
  response_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: <Send className="h-3 w-3" /> },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
  partially_approved: { label: 'Partially Approved', color: 'bg-lime-100 text-lime-800', icon: <CheckCircle className="h-3 w-3" /> },
  denied: { label: 'Denied', color: 'bg-destructive/10 text-destructive', icon: <XCircle className="h-3 w-3" /> },
  appealed: { label: 'Appealed', color: 'bg-purple-100 text-purple-800', icon: <RefreshCw className="h-3 w-3" /> },
};

const INSURANCE_PROVIDERS = [
  'ZSIC Life',
  'Madison General Insurance',
  'Professional Insurance Corporation (PICZ)',
  'Hollard Insurance Zambia',
  'Prudential Life Assurance',
  'SES Insurance',
  'African Grey Insurance',
  'Alliance Insurance',
  'NICO Insurance',
  'First Mutual Health',
  'Other',
];

export const InsuranceClaimWorkflow: React.FC = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [claimForm, setClaimForm] = useState({
    patient_name: '',
    insurance_provider: '',
    policy_number: '',
    claim_type: 'submission' as InsuranceClaim['claim_type'],
    claimed_amount: 0,
    diagnosis_codes: '',
    procedure_codes: '',
    service_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const fetchClaims = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setClaims((data as unknown as InsuranceClaim[]) || []);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const generateClaimNumber = () => {
    const prefix = 'CLM';
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${date}-${random}`;
  };

  const handleCreateClaim = async () => {
    if (!institutionId || !user) return;

    setCreating(true);
    try {
      const claimNumber = generateClaimNumber();
      const diagnosisCodes = claimForm.diagnosis_codes.split(',').map(c => c.trim()).filter(Boolean);
      const procedureCodes = claimForm.procedure_codes.split(',').map(c => c.trim()).filter(Boolean);

      const { error } = await supabase
        .from('insurance_claims')
        .insert({
          institution_id: institutionId,
          patient_name: claimForm.patient_name,
          insurance_provider: claimForm.insurance_provider,
          policy_number: claimForm.policy_number,
          claim_number: claimNumber,
          claim_type: claimForm.claim_type,
          claimed_amount: claimForm.claimed_amount,
          diagnosis_codes: diagnosisCodes,
          procedure_codes: procedureCodes,
          service_date: claimForm.service_date,
          notes: claimForm.notes || null,
          status: 'draft',
          created_by: user.id,
        } as any);

      if (error) throw error;

      toast.success(`Claim ${claimNumber} created`);
      setShowCreateDialog(false);
      fetchClaims();
      setClaimForm({
        patient_name: '',
        insurance_provider: '',
        policy_number: '',
        claim_type: 'submission',
        claimed_amount: 0,
        diagnosis_codes: '',
        procedure_codes: '',
        service_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    } catch (err: any) {
      toast.error('Failed to create claim: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const submitClaim = async (claimId: string) => {
    try {
      const { error } = await supabase
        .from('insurance_claims')
        .update({
          status: 'submitted',
          submission_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', claimId);

      if (error) throw error;

      toast.success('Claim submitted to insurance');
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateClaimStatus = async (claimId: string, status: InsuranceClaim['status'], extras?: Partial<InsuranceClaim>) => {
    try {
      const { error } = await supabase
        .from('insurance_claims')
        .update({
          status,
          ...extras,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', claimId);

      if (error) throw error;

      toast.success(`Claim status updated to ${status}`);
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Metrics
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => ['submitted', 'under_review', 'appealed'].includes(c.status));
  const approvedClaims = claims.filter(c => ['approved', 'partially_approved'].includes(c.status));
  const deniedClaims = claims.filter(c => c.status === 'denied');
  const totalClaimed = claims.reduce((sum, c) => sum + c.claimed_amount, 0);
  const totalApproved = claims.reduce((sum, c) => sum + (c.approved_amount || 0), 0);
  const approvalRate = totalClaims > 0 ? (approvedClaims.length / totalClaims) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Insurance Claims & TPA</h2>
          <p className="text-muted-foreground">Submit, track, and manage insurance claims</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Claim</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Insurance Claim</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
              <div>
                <Label>Patient Name</Label>
                <Input
                  value={claimForm.patient_name}
                  onChange={e => setClaimForm({ ...claimForm, patient_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Insurance Provider</Label>
                  <Select
                    value={claimForm.insurance_provider}
                    onValueChange={v => setClaimForm({ ...claimForm, insurance_provider: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {INSURANCE_PROVIDERS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Policy Number</Label>
                  <Input
                    value={claimForm.policy_number}
                    onChange={e => setClaimForm({ ...claimForm, policy_number: e.target.value })}
                    placeholder="POL-123456"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Claim Type</Label>
                  <Select
                    value={claimForm.claim_type}
                    onValueChange={v => setClaimForm({ ...claimForm, claim_type: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_authorization">Pre-Authorization</SelectItem>
                      <SelectItem value="submission">Claim Submission</SelectItem>
                      <SelectItem value="reimbursement">Reimbursement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service Date</Label>
                  <Input
                    type="date"
                    value={claimForm.service_date}
                    onChange={e => setClaimForm({ ...claimForm, service_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Claimed Amount (ZMW)</Label>
                <Input
                  type="number"
                  value={claimForm.claimed_amount}
                  onChange={e => setClaimForm({ ...claimForm, claimed_amount: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div>
                <Label>ICD-10 Diagnosis Codes</Label>
                <Input
                  value={claimForm.diagnosis_codes}
                  onChange={e => setClaimForm({ ...claimForm, diagnosis_codes: e.target.value })}
                  placeholder="J06.9, R05 (comma-separated)"
                />
              </div>
              <div>
                <Label>CPT Procedure Codes</Label>
                <Input
                  value={claimForm.procedure_codes}
                  onChange={e => setClaimForm({ ...claimForm, procedure_codes: e.target.value })}
                  placeholder="99213, 85025 (comma-separated)"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={claimForm.notes}
                  onChange={e => setClaimForm({ ...claimForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional information..."
                />
              </div>
              <Button
                onClick={handleCreateClaim}
                disabled={creating || !claimForm.patient_name || !claimForm.insurance_provider || claimForm.claimed_amount <= 0}
                className="w-full"
              >
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Claim
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalClaims}</p>
            <p className="text-xs text-muted-foreground">Total Claims</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{pendingClaims.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{approvedClaims.length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold text-destructive">{deniedClaims.length}</p>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">K{totalApproved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Approved Amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Approval Rate</span>
            <span className="font-medium">{approvalRate.toFixed(1)}%</span>
          </div>
          <Progress value={approvalRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Claims List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Claims ({totalClaims})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingClaims.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedClaims.length})</TabsTrigger>
          <TabsTrigger value="denied">Denied ({deniedClaims.length})</TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'denied'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {(tab === 'all' ? claims :
                  tab === 'pending' ? pendingClaims :
                  tab === 'approved' ? approvedClaims :
                  deniedClaims
                ).length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No {tab === 'all' ? '' : tab} claims found.
                    </CardContent>
                  </Card>
                ) : (
                  (tab === 'all' ? claims :
                    tab === 'pending' ? pendingClaims :
                    tab === 'approved' ? approvedClaims :
                    deniedClaims
                  ).map(claim => {
                    const statusConfig = STATUS_CONFIG[claim.status] || STATUS_CONFIG.draft;
                    return (
                      <Card key={claim.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{claim.claim_number}</span>
                                <Badge className={statusConfig.color}>
                                  {statusConfig.icon}
                                  <span className="ml-1">{statusConfig.label}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {claim.patient_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {claim.insurance_provider}
                                </span>
                                <span>Policy: {claim.policy_number}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span>Claimed: <strong>K{claim.claimed_amount.toLocaleString()}</strong></span>
                                {claim.approved_amount !== null && (
                                  <span className="text-green-600">
                                    Approved: <strong>K{claim.approved_amount.toLocaleString()}</strong>
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  Service: {format(new Date(claim.service_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                              {claim.denial_reason && (
                                <p className="text-sm text-destructive">
                                  Denial reason: {claim.denial_reason}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {claim.status === 'draft' && (
                                <Button size="sm" onClick={() => submitClaim(claim.id)}>
                                  <Send className="h-3 w-3 mr-1" /> Submit
                                </Button>
                              )}
                              {claim.status === 'under_review' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => updateClaimStatus(claim.id, 'approved', {
                                      approved_amount: claim.claimed_amount,
                                      response_date: new Date().toISOString(),
                                    })}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateClaimStatus(claim.id, 'denied', {
                                      response_date: new Date().toISOString(),
                                    })}
                                  >
                                    Deny
                                  </Button>
                                </>
                              )}
                              {claim.status === 'denied' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateClaimStatus(claim.id, 'appealed')}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" /> Appeal
                                </Button>
                              )}
                              {claim.status === 'submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateClaimStatus(claim.id, 'under_review')}
                                >
                                  Mark Under Review
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
