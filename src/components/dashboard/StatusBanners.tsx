import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle2, AlertCircle, AlertTriangle, 
  User, FileText, ArrowRight 
} from 'lucide-react';

interface PendingApplication {
  id: string;
  status: string;
  specialty?: string;
  created_at?: string;
  review_notes?: string;
}

/**
 * Shows application status (pending/under review/rejected) 
 * and profile completeness prompts for any role.
 */
export const ApplicationStatusBanner = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [hpApplication, setHpApplication] = useState<PendingApplication | null>(null);
  const [institutionApplication, setInstitutionApplication] = useState<PendingApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchApplications = async () => {
      try {
        // Fetch health personnel application
        const { data: hpData } = await supabase
          .from('health_personnel_applications')
          .select('id, status, specialty, created_at, review_notes')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (hpData) setHpApplication(hpData as PendingApplication);

        // Fetch institution application
        const { data: instData } = await supabase
          .from('institution_applications')
          .select('id, status, institution_name, created_at, reviewer_notes')
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (instData) setInstitutionApplication({
          id: instData.id,
          status: instData.status || 'pending',
          specialty: instData.institution_name,
          created_at: instData.created_at,
          review_notes: instData.reviewer_notes
        });
      } catch (err) {
        console.error('Error fetching applications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  if (loading || !user) return null;

  const renderApplicationBanner = (app: PendingApplication, type: string) => {
    if (!app || app.status === 'approved') return null;

    const statusConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'destructive'; bgClass: string; title: string; desc: string }> = {
      pending: {
        icon: <Clock className="h-5 w-5" />,
        variant: 'default',
        bgClass: 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10',
        title: `${type} Application Pending`,
        desc: `Your ${type.toLowerCase()} application${app.specialty ? ` for ${app.specialty}` : ''} is waiting for review. We'll notify you once it's reviewed.`
      },
      under_review: {
        icon: <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        variant: 'default',
        bgClass: 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10',
        title: `${type} Application Under Review`,
        desc: `Your application is being reviewed by our team. This usually takes 1-3 business days.`
      },
      rejected: {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />,
        variant: 'destructive',
        bgClass: 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10',
        title: `${type} Application Not Approved`,
        desc: app.review_notes || 'Your application was not approved. Please review the feedback and resubmit.'
      }
    };

    const config = statusConfig[app.status] || statusConfig.pending;

    return (
      <Alert key={app.id} className={`${config.bgClass} mb-4`}>
        {config.icon}
        <AlertTitle className="flex items-center gap-2">
          {config.title}
          <Badge variant={app.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
            {app.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-1">
          <p className="text-sm text-muted-foreground mb-2">{config.desc}</p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/application-status')}
              className="text-xs"
            >
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
            {app.status === 'rejected' && (
              <Button 
                size="sm" 
                onClick={() => navigate(type === 'Provider' ? '/healthcare-application' : '/institution-registration')}
                className="text-xs"
              >
                Reapply
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div>
      {hpApplication && renderApplicationBanner(hpApplication, 'Provider')}
      {institutionApplication && renderApplicationBanner(institutionApplication, 'Institution')}
    </div>
  );
};

/**
 * Profile completeness checker — prompts users to fill in missing info.
 */
export const ProfileCompleteBanner = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const fields = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'phone', label: 'Phone number' },
    { key: 'address', label: 'Address' },
    { key: 'date_of_birth', label: 'Date of birth' },
  ];

  const filled = fields.filter(f => {
    const val = (profile as any)?.[f.key];
    return val && val.toString().trim() !== '';
  });

  const pct = Math.round((filled.length / fields.length) * 100);
  const missing = fields.filter(f => !filled.includes(f));

  if (pct >= 100) return null;

  return (
    <Alert className="border-primary/30 bg-primary/5 dark:bg-primary/10 mb-4">
      <User className="h-5 w-5 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        Complete Your Profile
        <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
      </AlertTitle>
      <AlertDescription className="mt-1">
        <p className="text-sm text-muted-foreground mb-2">
          Missing: {missing.map(m => m.label).join(', ')}
        </p>
        <Progress value={pct} className="h-1.5 mb-3" />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/profile')}
          className="text-xs"
        >
          Update Profile <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};
