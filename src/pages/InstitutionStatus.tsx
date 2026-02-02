import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Upload, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface InstitutionApplication {
  id: string;
  institution_name: string;
  institution_type: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  documents_complete: boolean;
  verification_complete: boolean;
  payment_complete: boolean;
}

const InstitutionStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<InstitutionApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [user]);

  const fetchApplication = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('institution_applications')
        .select('*')
        .eq('applicant_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setApplication(data as any);
    } catch (error) {
      console.error('Error fetching application:', error);
      toast.error('Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500 dark:text-red-400" />;
      case 'under_review':
        return <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400" />;
      default:
        return <AlertCircle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      under_review: 'default',
      approved: 'default',
      rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="text-sm">
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const calculateProgress = () => {
    if (!application) return 0;

    let progress = 0;
    if (application.documents_complete) progress += 33;
    if (application.verification_complete) progress += 33;
    if (application.payment_complete) progress += 34;

    return progress;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Application Found</h2>
            <p className="text-muted-foreground mb-6 text-center">
              You haven't submitted an institution registration application yet.
            </p>
            <Button onClick={() => navigate('/institution-registration')}>
              Start Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Institution Application Status
          </h1>
          <p className="text-muted-foreground">{application.institution_name}</p>
        </div>
        {getStatusBadge(application.status)}
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(application.status)}
            Application Progress
          </CardTitle>
          <CardDescription>
            Track the progress of your institution registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-medium">{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <FileText
                className={`h-5 w-5 mt-0.5 ${application.documents_complete ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'
                  }`}
              />
              <div>
                <p className="font-medium text-sm">Documents</p>
                <p className="text-xs text-muted-foreground">
                  {application.documents_complete ? 'Complete' : 'Pending'}
                </p>
              </div>
              {application.documents_complete && (
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 ml-auto" />
              )}
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <CheckCircle2
                className={`h-5 w-5 mt-0.5 ${application.verification_complete ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'
                  }`}
              />
              <div>
                <p className="font-medium text-sm">Verification</p>
                <p className="text-xs text-muted-foreground">
                  {application.verification_complete ? 'Complete' : 'In Progress'}
                </p>
              </div>
              {application.verification_complete && (
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 ml-auto" />
              )}
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Upload
                className={`h-5 w-5 mt-0.5 ${application.payment_complete ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'
                  }`}
              />
              <div>
                <p className="font-medium text-sm">Payment</p>
                <p className="text-xs text-muted-foreground">
                  {application.payment_complete ? 'Complete' : 'Pending'}
                </p>
              </div>
              {application.payment_complete && (
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 ml-auto" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Details */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Institution Name</p>
              <p className="font-medium">{application.institution_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Institution Type</p>
              <p className="font-medium capitalize">{application.institution_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted On</p>
              <p className="font-medium">
                {format(new Date(application.submitted_at), 'PPP')}
              </p>
            </div>
            {application.reviewed_at && (
              <div>
                <p className="text-sm text-muted-foreground">Reviewed On</p>
                <p className="font-medium">
                  {format(new Date(application.reviewed_at), 'PPP')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reviewer Notes */}
      {application.reviewer_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Reviewer Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{application.reviewer_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {application.status === 'pending' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
              <Clock className="h-5 w-5 text-yellow-800 dark:text-yellow-300 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-yellow-900 dark:text-yellow-100">Awaiting Review</p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  Your application is in queue for review. You'll be notified once it's being processed.
                </p>
              </div>
            </div>
          )}

          {application.status === 'under_review' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-5 w-5 text-blue-800 dark:text-blue-300 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Under Review</p>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Our team is currently reviewing your application. This typically takes 3-5 business days.
                </p>
              </div>
            </div>
          )}

          {application.status === 'approved' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-800 dark:text-green-300 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-green-900 dark:text-green-100">Application Approved!</p>
                <p className="text-xs text-green-800 dark:text-green-300 mb-3">
                  Congratulations! Your institution has been approved. You can now access the institution portal.
                </p>
                <Button size="sm" onClick={() => navigate('/institution-portal')}>
                  Go to Portal
                </Button>
              </div>
            </div>
          )}

          {application.status === 'rejected' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-800 dark:text-red-300 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-red-900 dark:text-red-100">Application Rejected</p>
                <p className="text-xs text-red-800 dark:text-red-300 mb-3">
                  Unfortunately, your application was not approved. Please review the reviewer notes above and consider reapplying.
                </p>
                <Button size="sm" variant="outline" onClick={() => navigate('/institution-registration')}>
                  Start New Application
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstitutionStatus;
