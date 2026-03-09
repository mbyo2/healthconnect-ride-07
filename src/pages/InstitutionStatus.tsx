import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Upload, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInstitutionContext } from '@/hooks/useInstitutionContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { format } from 'date-fns';

const InstitutionStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { institution, loading, isAdmin } = useInstitutionContext();

  const getStatus = () => {
    if (!institution) return 'not_found';
    if (institution.is_verified) return 'approved';
    return 'pending';
  };

  const status = getStatus();

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'approved': return <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />;
      case 'rejected': return <XCircle className="h-6 w-6 text-red-500 dark:text-red-400" />;
      default: return <Clock className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />;
    }
  };

  const getStatusBadge = (s: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      approved: { variant: 'default', label: 'APPROVED' },
      pending: { variant: 'secondary', label: 'PENDING VERIFICATION' },
      not_found: { variant: 'outline', label: 'NOT REGISTERED' },
    };
    const c = config[s] || config.not_found;
    return <Badge variant={c.variant} className="text-sm">{c.label}</Badge>;
  };

  const progress = !institution ? 0 : institution.is_verified ? 100 : 
    (institution.license_number ? 33 : 0) + (institution.address ? 33 : 0) + (institution.phone ? 34 : 0);

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Institution Found</h2>
            <p className="text-muted-foreground mb-6 text-center">
              You haven't registered a healthcare institution yet.
            </p>
            <Button onClick={() => navigate('/institution-registration')}>Start Registration</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Institution Status
          </h1>
          <p className="text-muted-foreground">{institution.name}</p>
        </div>
        {getStatusBadge(status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(status)}
            Registration Progress
          </CardTitle>
          <CardDescription>Track the status of your institution registration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <FileText className={`h-5 w-5 mt-0.5 ${institution.license_number ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">License</p>
                <p className="text-xs text-muted-foreground">{institution.license_number ? 'Submitted' : 'Pending'}</p>
              </div>
              {institution.license_number && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <CheckCircle2 className={`h-5 w-5 mt-0.5 ${institution.address ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">Address</p>
                <p className="text-xs text-muted-foreground">{institution.address ? 'Complete' : 'Missing'}</p>
              </div>
              {institution.address && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Upload className={`h-5 w-5 mt-0.5 ${institution.is_verified ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">Verification</p>
                <p className="text-xs text-muted-foreground">{institution.is_verified ? 'Approved' : 'Awaiting Review'}</p>
              </div>
              {institution.is_verified && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Institution Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{institution.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{institution.type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">City</p>
              <p className="font-medium">{institution.city || 'N/A'}</p>
            </div>
            {institution.created_at && (
              <div>
                <p className="text-muted-foreground">Registered On</p>
                <p className="font-medium">{format(new Date(institution.created_at), 'PPP')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Next Steps</CardTitle></CardHeader>
        <CardContent>
          {status === 'pending' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
              <Clock className="h-5 w-5 text-yellow-800 dark:text-yellow-300 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-yellow-900 dark:text-yellow-100">Awaiting Verification</p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  An administrator will review and verify your institution. This typically takes 3-5 business days.
                </p>
              </div>
            </div>
          )}
          {status === 'approved' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-800 dark:text-green-300 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-green-900 dark:text-green-100">Institution Verified!</p>
                <p className="text-xs text-green-800 dark:text-green-300 mb-3">
                  Your institution is fully verified. Access all features from the dashboard.
                </p>
                <Button size="sm" onClick={() => navigate('/institution-dashboard')}>Go to Dashboard</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstitutionStatus;
