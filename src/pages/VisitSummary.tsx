import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Calendar,
  Clock,
  FileText,
  Pill,
  MessageCircle,
  ArrowRight,
  Home,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { providerDisplayName } from '@/utils/providerDisplay';

/**
 * Post-visit summary — the closure screen every patient sees after a video
 * visit ends. What was discussed, prescriptions issued, next steps, and how
 * to reach the provider. Plain language throughout.
 */
const VisitSummary = () => {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !consultationId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Consultation — only participants may view.
        const { data: visit, error: visitError } = await supabase
          .from('video_consultations')
          .select(`
            *,
            provider:profiles!video_consultations_provider_id_fkey(
              first_name, last_name, specialty, role
            )
          `)
          .eq('id', consultationId)
          .maybeSingle();
        if (visitError) throw visitError;
        if (!visit || (visit.patient_id !== user.id && visit.provider_id !== user.id)) {
          if (!cancelled) setConsultation(null);
          return;
        }
        if (!cancelled) setConsultation(visit);

        // Clinical notes recorded around the visit (doctor's notes, next steps).
        const visitDate = new Date(visit.scheduled_start).toISOString().slice(0, 10);
        const { data: records } = await supabase
          .from('comprehensive_medical_records')
          .select('id, title, description, record_type, visit_date, created_at')
          .eq('patient_id', visit.patient_id)
          .eq('visit_date', visitDate)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!cancelled) setNotes(records || []);

        // Prescriptions issued by this provider on/after the visit day.
        const { data: rx } = await supabase
          .from('comprehensive_prescriptions')
          .select('id, medication_name, dosage, instructions, quantity, prescribed_date, status')
          .eq('patient_id', visit.patient_id)
          .eq('provider_id', visit.provider_id)
          .gte('prescribed_date', visitDate)
          .order('prescribed_date', { ascending: false })
          .limit(10);
        if (!cancelled) setPrescriptions(rx || []);
      } catch (err) {
        console.error('Failed to load visit summary:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, consultationId]);

  const durationMinutes = (() => {
    if (!consultation?.scheduled_start || !consultation?.scheduled_end) return null;
    return Math.round(
      (new Date(consultation.scheduled_end).getTime() -
        new Date(consultation.scheduled_start).getTime()) /
        60000
    );
  })();

  const providerName = consultation?.provider
    ? providerDisplayName({
        first_name: consultation.provider.first_name,
        last_name: consultation.provider.last_name,
        role: consultation.provider.role,
      })
    : 'Your doctor';

  return (
    <ProtectedRoute>
      {loading ? (
        <LoadingScreen message="Loading your visit summary…" />
      ) : !consultation ? (
        <div className="container mx-auto px-4 py-12 max-w-lg text-center space-y-4">
          <p className="text-muted-foreground">
            We couldn't find this visit summary. It may belong to a different account.
          </p>
          <Button onClick={() => navigate('/video-consultations')} className="min-h-[44px]">
            Back to Video Consultations
          </Button>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">
              Your visit summary
            </h1>
            <p className="text-[15px] text-muted-foreground">
              {providerName}
              {consultation.provider?.specialty ? ` · ${consultation.provider.specialty}` : ''}
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(consultation.scheduled_start), 'EEE, MMM d, yyyy')}
              </span>
              {durationMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {durationMinutes} min
                </span>
              )}
              <Badge variant="outline">{consultation.status}</Badge>
            </div>
          </div>

          {/* What was discussed */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <FileText className="h-5 w-5 text-primary" />
                What was discussed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Your doctor hasn't added visit notes yet. Notes usually appear
                  here within a day — check back later.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-xl bg-muted/50 p-3">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{n.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Prescriptions */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <Pill className="h-5 w-5 text-primary" />
                Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No prescriptions were issued during this visit.
                </p>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {prescriptions.map((p) => (
                      <li key={p.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="text-sm font-medium text-foreground">
                          {p.medication_name}
                          {p.dosage ? ` · ${p.dosage}` : ''}
                        </p>
                        {p.instructions && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{p.instructions}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px]"
                    onClick={() => navigate('/prescriptions')}
                  >
                    View all prescriptions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next steps */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <ClipboardList className="h-5 w-5 text-primary" />
                Next steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Follow any instructions your doctor gave during the visit. If you
                were asked to book a follow-up, do it here:
              </p>
              <Button
                className="w-full min-h-[44px]"
                onClick={() => navigate('/video-consultations')}
              >
                Book a follow-up visit
              </Button>
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => navigate('/chat')}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Message {providerName}
              </Button>
            </CardContent>
          </Card>

          {/* Home */}
          <Button
            variant="ghost"
            className="w-full min-h-[44px]"
            onClick={() => navigate('/home')}
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      )}
    </ProtectedRoute>
  );
};

export default VisitSummary;
