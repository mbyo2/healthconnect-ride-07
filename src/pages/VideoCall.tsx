import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { VideoRoom } from '@/components/video/VideoRoom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { logAnalyticsEvent } from '@/utils/analytics-service';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VideoOff } from 'lucide-react';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Video call room — route param is `roomId` (see App.tsx `/video-call/:roomId`).
 *
 * Two entry modes, both ending in a real Daily room:
 *  1. Booked consultation — roomId is the video_consultations UUID. The
 *     consultation is loaded (patient or provider side), a Daily room is
 *     minted on demand when missing, and status moves scheduled → active.
 *     As a fallback, roomId may also be an appointments UUID (the
 *     Appointments "Join" buttons link that way): the appointment is
 *     resolved and its consultation row is minted idempotently on demand.
 *  2. Instant room — ?instant=1 (or any non-UUID id). An ad-hoc
 *     consultation record is created for the current user so the call is
 *     tracked, billed and reviewable like any other visit; the link can be
 *     shared to invite the other party.
 *
 * On leave, providers close the visit (→ completed); patients simply leave
 * so they can rejoin while the visit is still live.
 */
const VideoCall = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (profile?.first_name || user?.user_metadata?.full_name) {
      setUserName(
        [profile?.first_name, (profile as any)?.last_name].filter(Boolean).join(' ') ||
          user?.user_metadata?.full_name ||
          user?.email?.split('@')[0] ||
          'Guest'
      );
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    } else {
      setUserName('Guest');
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user || !roomId) return;
    let cancelled = false;

    const prepare = async () => {
      setLoading(true);
      setFatalError(null);
      try {
        let consultation: any = null;
        // ?instant=1 forces ad-hoc mode: the instant-room buttons navigate
        // with a UUID, which would otherwise be mistaken for a booked id.
        const forceInstant = searchParams.get('instant') === '1';

        if (!forceInstant && UUID_RE.test(roomId)) {
          // Mode 1 — booked consultation: only participants may open it.
          const { data, error } = await supabase
            .from('video_consultations')
            .select('*')
            .eq('id', roomId)
            .maybeSingle();
          if (error) throw error;
          if (!data) {
            // Fallback — roomId is an appointments UUID. The Appointments
            // "Join" buttons link /video-call/<appointment_id>; resolve the
            // appointment and mint its consultation row idempotently.
            const { data: appt, error: apptError } = await supabase
              .from('appointments')
              .select('id, patient_id, provider_id, status')
              .eq('id', roomId)
              .maybeSingle();
            if (apptError) throw apptError;
            if (!appt) {
              setFatalError('This consultation link is invalid or has been removed.');
              setLoading(false);
              return;
            }
            if (appt.patient_id !== user.id && appt.provider_id !== user.id) {
              setFatalError('You are not a participant in this consultation.');
              setLoading(false);
              return;
            }
            // Idempotency tag in notes: patient and provider joining the same
            // appointment link must land in the SAME consultation/Daily room.
            const noteTag = `Video visit for appointment ${appt.id}`;
            const { data: existing, error: existingError } = await supabase
              .from('video_consultations')
              .select('*')
              .eq('notes', noteTag)
              .in('status', ['scheduled', 'active'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (existingError) throw existingError;
            if (existing) {
              consultation = existing;
            } else {
              const now = new Date();
              const { data: minted, error: mintError } = await supabase
                .from('video_consultations')
                .insert({
                  patient_id: appt.patient_id,
                  provider_id: appt.provider_id,
                  scheduled_start: now.toISOString(),
                  scheduled_end: new Date(now.getTime() + 30 * 60000).toISOString(),
                  status: 'scheduled',
                  notes: noteTag,
                })
                .select()
                .single();
              if (mintError) throw mintError;
              consultation = minted;
            }
          } else {
            if (data.patient_id !== user.id && data.provider_id !== user.id) {
              setFatalError('You are not a participant in this consultation.');
              setLoading(false);
              return;
            }
            consultation = data;
          }
        } else {
          // Mode 2 — instant room: track it as an ad-hoc consultation so it
          // shows in history and can be billed like a normal visit.
          const now = new Date();
          const { data, error } = await supabase
            .from('video_consultations')
            .insert({
              patient_id: user.id,
              provider_id: user.id,
              scheduled_start: now.toISOString(),
              scheduled_end: new Date(now.getTime() + 30 * 60000).toISOString(),
              status: 'scheduled',
              notes: `Instant teledoctor room (${roomId})`,
            })
            .select()
            .single();
          if (error) throw error;
          consultation = data;
        }

        if (cancelled) return;
        setConsultationId(consultation.id);

        // Mint the Daily room on demand when missing.
        if (!consultation.meeting_url) {
          toast.loading('Setting up your secure video room…');
          const { data: fnData, error: fnError } = await supabase.functions.invoke('create-daily-room', {
            body: { consultation_id: consultation.id },
          });
          if (cancelled) return;
          if (fnError) throw fnError;
          const url = (fnData as any)?.url;
          if (!url) throw new Error('Video service did not return a room URL.');
          toast.dismiss();
          setMeetingUrl(url);
        } else {
          setMeetingUrl(consultation.meeting_url);
        }

        // Mark the visit live (idempotent). DB CHECK allows
        // ('scheduled','active','completed','cancelled') — never 'in_progress'.
        if (consultation.status === 'scheduled') {
          await supabase
            .from('video_consultations')
            .update({ status: 'active' })
            .eq('id', consultation.id);
        }

        logAnalyticsEvent('video_call_opened', {
          consultation_id: consultation.id,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('Failed to prepare video call:', err);
        toast.dismiss();
        if (!cancelled) {
          setFatalError(
            err?.message || 'Could not start the video call. Check your connection and try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    prepare();
    return () => {
      cancelled = true;
    };
  }, [user, roomId, searchParams]);

  const handleLeave = useCallback(async () => {
    logAnalyticsEvent('video_call_ended', { consultation_id: consultationId });
    // Providers close the visit on leave; patients can rejoin while live.
    const role = (profile?.role || '').toLowerCase();
    try {
      if (consultationId && role !== '' && role !== 'patient') {
        await supabase
          .from('video_consultations')
          .update({ status: 'completed' })
          .eq('id', consultationId)
          .eq('status', 'active');
      }
    } catch (err) {
      console.error('Failed to close consultation:', err);
    }
    navigate('/video-consultations', { replace: true });
  }, [consultationId, profile, navigate]);

  return (
    <ProtectedRoute>
      {loading ? (
        <LoadingScreen message="Preparing your secure video room…" />
      ) : fatalError || !meetingUrl ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
          <div className="max-w-sm w-full vf-card text-center space-y-4">
            <VideoOff className="h-10 w-10 mx-auto text-error-500" />
            <h1 className="font-display text-xl text-midnight">Cannot join this call</h1>
            <p className="text-sm text-graphite-500">{fatalError || 'No video room is available for this link.'}</p>
            <Button onClick={() => navigate('/video-consultations')} className="w-full">
              Back to Video Consultations
            </Button>
          </div>
        </div>
      ) : (
        <VideoRoom roomUrl={meetingUrl} userName={userName} onLeave={handleLeave} />
      )}
    </ProtectedRoute>
  );
};

export default VideoCall;
