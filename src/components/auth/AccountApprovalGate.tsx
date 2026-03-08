import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if the current non-patient user's account has been approved.
 * Shows a pending/rejected status screen if not approved.
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
        .select('status, review_notes, reviewed_at')
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

  // Determine status
  const status = application?.status || (institution ? 'pending' : 'pending');
  const isRejected = status === 'rejected';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 rounded-full bg-muted w-fit">
            {isRejected ? (
              <XCircle className="h-12 w-12 text-destructive" />
            ) : (
              <Clock className="h-12 w-12 text-amber-500 animate-pulse" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isRejected ? 'Application Not Approved' : 'Account Under Review'}
          </CardTitle>
          <CardDescription className="text-base">
            {isRejected
              ? 'Unfortunately, your application was not approved at this time.'
              : 'Your account is being reviewed by our team. This usually takes 1-2 business days.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Application Status</span>
              <Badge variant={isRejected ? 'destructive' : status === 'approved' ? 'default' : 'secondary'}>
                {status === 'pending' ? '⏳ Pending Review' : status === 'under_review' ? '🔍 Under Review' : isRejected ? '❌ Rejected' : '✅ Approved'}
              </Badge>
            </div>
            {application?.review_notes && (
              <div className="text-sm text-muted-foreground border-t pt-2">
                <p className="font-medium text-xs text-foreground mb-1">Review Notes:</p>
                {application.review_notes}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              What you can do while waiting:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-6">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Complete your profile</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Upload additional documents</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Explore the platform as a patient</li>
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
            <p className="text-xs text-center text-muted-foreground">
              If you believe this was in error, please contact support at support@dococlockzm.com
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
