import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle2, XCircle, FileText, ArrowRight, ShieldCheck, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REQUIRED_DOCS_BY_ROLE: Record<string, string[]> = {
  doctor: ['Medical License', 'Medical Degree Certificate', 'ID / Passport'],
  nurse: ['Nursing License', 'Nursing Certificate', 'ID / Passport'],
  pharmacist: ['Pharmacy License', 'Pharmacy Degree', 'ID / Passport'],
  lab_technician: ['Lab Technician Certificate', 'ID / Passport'],
  radiologist: ['Radiology License', 'Medical Degree', 'ID / Passport'],
  health_personnel: ['Professional License', 'ID / Passport'],
  pharmacy: ['Pharmacy Business License', 'Tax Registration', 'Premises Certificate'],
  lab: ['Laboratory License', 'Accreditation Certificate', 'Tax Registration'],
  institution_admin: ['Business Registration', 'Operating License', 'Tax Registration', 'Accreditation Certificate'],
};

const DocumentUploadSection = ({ userId, userRole }: { userId: string; userRole: string }) => {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: uploadedDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['registration-docs', userId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('registration_documents')
        .list(userId, { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      return data || [];
    },
  });

  const requiredDocs = REQUIRED_DOCS_BY_ROLE[userRole] || REQUIRED_DOCS_BY_ROLE['health_personnel'];

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, docLabel: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, or WebP files are accepted.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const safeName = docLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const path = `${userId}/${safeName}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('registration_documents')
        .upload(path, file);

      if (error) throw error;

      // Update the documents_url array in health_personnel_applications
      const { data: app } = await supabase
        .from('health_personnel_applications')
        .select('documents_url')
        .eq('user_id', userId)
        .maybeSingle();

      const currentDocs = app?.documents_url || [];
      await supabase
        .from('health_personnel_applications')
        .update({ documents_url: [...currentDocs, path] })
        .eq('user_id', userId);

      toast.success(`${docLabel} uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['registration-docs', userId] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [userId, queryClient]);

  const handleDelete = useCallback(async (fileName: string) => {
    try {
      const path = `${userId}/${fileName}`;
      await supabase.storage.from('registration_documents').remove([path]);

      // Also remove from applications
      const { data: app } = await supabase
        .from('health_personnel_applications')
        .select('documents_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (app?.documents_url) {
        const updated = app.documents_url.filter((d: string) => !d.includes(fileName));
        await supabase
          .from('health_personnel_applications')
          .update({ documents_url: updated })
          .eq('user_id', userId);
      }

      toast.success('Document removed');
      queryClient.invalidateQueries({ queryKey: ['registration-docs', userId] });
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  }, [userId, queryClient]);

  const getDocStatus = (docLabel: string) => {
    if (!uploadedDocs) return false;
    const safeName = docLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return uploadedDocs.some(d => d.name.startsWith(safeName));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Upload className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Required Documents</h4>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload the following documents for verification. Accepted formats: PDF, JPG, PNG (max 10MB each).
      </p>

      <div className="space-y-3">
        {requiredDocs.map((docLabel) => {
          const isUploaded = getDocStatus(docLabel);
          return (
            <div key={docLabel} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex-shrink-0">
                {isUploaded ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{docLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {isUploaded ? 'Uploaded ✓' : 'Not uploaded yet'}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Label htmlFor={`doc-${docLabel}`} className="cursor-pointer">
                  <div className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isUploaded 
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : isUploaded ? 'Replace' : 'Upload'}
                  </div>
                </Label>
                <Input
                  id={`doc-${docLabel}`}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, docLabel)}
                  disabled={uploading}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show uploaded files */}
      {uploadedDocs && uploadedDocs.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <p className="text-xs font-medium mb-2 text-muted-foreground">Uploaded Files ({uploadedDocs.length})</p>
          <div className="space-y-1">
            {uploadedDocs.map((doc) => (
              <div key={doc.name} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                <span className="truncate flex-1">{doc.name.replace(/_\d+\./, '.').replace(/_/g, ' ')}</span>
                <button
                  onClick={() => handleDelete(doc.name)}
                  className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {docsLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading documents...
        </div>
      )}
    </div>
  );
};

/**
 * Checks if the current non-patient user's account has been approved.
 * Shows a pending/rejected status screen with document upload if not approved.
 * Patients pass through automatically.
 */
export const AccountApprovalGate = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const { currentRole } = useUserRoles();
  const navigate = useNavigate();

  const isPatient = currentRole === 'patient' || profile?.role === 'patient';

  // Check application status for providers
  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ['application-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('health_personnel_applications')
        .select('status, review_notes, reviewed_at, documents_url')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !isPatient,
  });

  // Check institution verification for businesses
  const { data: institution, isLoading: instLoading } = useQuery({
    queryKey: ['institution-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('healthcare_institutions')
        .select('is_verified, name')
        .eq('admin_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !isPatient,
  });

  // Patients always pass through
  if (isPatient) return <>{children}</>;

  // Still loading
  if (appLoading || instLoading) return null;

  // Check if verified via profile
  if (profile?.is_verified) return <>{children}</>;

  // Provider with approved application
  if (application?.status === 'approved') return <>{children}</>;

  // Institution that is verified
  if (institution?.is_verified) return <>{children}</>;

  // Determine status and role for document requirements
  const status = application?.status || (institution ? 'pending' : 'pending');
  const isRejected = status === 'rejected';
  const effectiveRole = currentRole || 'health_personnel';
  const hasDocuments = application?.documents_url && application.documents_url.length > 0;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 rounded-full bg-muted w-fit">
            {isRejected ? (
              <XCircle className="h-12 w-12 text-destructive" />
            ) : (
              <Clock className="h-12 w-12 text-primary animate-pulse" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isRejected ? 'Application Not Approved' : 'Account Under Review'}
          </CardTitle>
          <CardDescription className="text-base">
            {isRejected
              ? 'Unfortunately, your application was not approved at this time.'
              : hasDocuments
                ? 'Your documents are being reviewed by our team. This usually takes 1-2 business days.'
                : 'Please upload your required documents to begin the verification process.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status badge */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Application Status</span>
              <Badge variant={isRejected ? 'destructive' : status === 'approved' ? 'default' : 'secondary'}>
                {status === 'pending' && !hasDocuments ? '📎 Documents Needed'
                  : status === 'pending' ? '⏳ Pending Review'
                  : status === 'under_review' ? '🔍 Under Review'
                  : isRejected ? '❌ Rejected'
                  : '✅ Approved'}
              </Badge>
            </div>
            {application?.review_notes && (
              <div className="text-sm text-muted-foreground border-t pt-2">
                <p className="font-medium text-xs text-foreground mb-1">Review Notes:</p>
                {application.review_notes}
              </div>
            )}
          </div>

          {/* Document Upload Section */}
          {user && !isRejected && (
            <DocumentUploadSection userId={user.id} userRole={effectiveRole} />
          )}

          {/* What you can do */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              While waiting:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-6">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary" /> Complete your profile</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary" /> Explore the platform as a patient</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/profile')}>
              <FileText className="h-4 w-4 mr-2" /> View Profile
            </Button>
            <Button className="flex-1" onClick={() => navigate('/home')}>
              Browse as Patient <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {isRejected && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-center text-muted-foreground">
                You may re-upload corrected documents and request a re-review.
              </p>
              {user && <DocumentUploadSection userId={user.id} userRole={effectiveRole} />}
              <p className="text-xs text-center text-muted-foreground">
                Or contact support at support@dococlockzm.com
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
