import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Application {
  id: string;
  application_type: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  notes?: string;
}

const ApplicationStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApplications(data as any || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      case 'under_review':
        return <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
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
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          My Applications
        </h1>
        <p className="text-muted-foreground">
          Track the status of your submitted applications
        </p>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Applications</h2>
            <p className="text-muted-foreground text-center mb-6">
              You haven't submitted any applications yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(application.status)}
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {application.application_type.replace('_', ' ')}
                      </CardTitle>
                      <CardDescription>
                        Submitted {format(new Date(application.submitted_at), 'PPP')}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(application.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.reviewed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed On</p>
                    <p className="text-sm font-medium">
                      {format(new Date(application.reviewed_at), 'PPP')}
                    </p>
                  </div>
                )}

                {application.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{application.notes}</p>
                  </div>
                )}

                {/* Status-specific messages */}
                {application.status === 'pending' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-sm">
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-900 dark:text-yellow-100">
                      Your application is awaiting review. You'll be notified once it's processed.
                    </p>
                  </div>
                )}

                {application.status === 'under_review' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-sm">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-900 dark:text-blue-100">
                      Your application is currently under review. This typically takes 3-5 business days.
                    </p>
                  </div>
                )}

                {application.status === 'approved' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-green-900 dark:text-green-100">
                      Your application has been approved! Check your email for next steps.
                    </p>
                  </div>
                )}

                {application.status === 'rejected' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-900 dark:text-red-100">
                      Your application was not approved. Please review the notes above for details.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.info("Download feature coming soon")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationStatus;
