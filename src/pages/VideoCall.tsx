import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { VideoRoom } from '@/components/video/VideoRoom';
import { PreVisitChecklist } from '@/components/video/PreVisitChecklist';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { logAnalyticsEvent } from '@/utils/analytics-service';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VideoOff } from 'lucide-react';
import { CONSULTABLE_PROVIDER_ROLES } from '@/config/roleConfig';
import { providerDisplayName } from '@/utils/providerDisplay';
import { friendlyErrorMessage } from '@/utils/friendly-error';

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
 * Leaving only removes the local participant — the visit stays live
 * and either side can rejoin. The provider additionally gets "End
 * Meeting", which closes the visit for everyone server-side
 * (end-video-consultation: status → completed + Daily room deleted).
 */
const VideoCall = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { availableRoles } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<any>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [preCheckDone, setPreCheckDone] = useState(false);
  const [startingCall, setStartingCall] = useState(false);

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

  // Step 1 — load the consultation (fast). The Daily room is only minted
  // after the patient passes the pre-visit checklist (startCall).
  useEffect(() => {
    if (!user || !roomId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setFatalError(null);
      try {
        let found: any = null;
        // ?instant=1 forces ad-hoc mode: the instant-room buttons navigate
        // with a UUID, which would otherwise be mistaken for a booked id.
        const forceInstant = searchParams.get('instant') === '1';

        if (!forceInstant && UUID_RE.test(roomId)) {
          // Mode 1 — booked consultation: only participants may open it.
          const { data, error } = await supabase
            .from('video_consultations')
            .select(`
              *,
              provider:profiles!video_consultations_provider_id_fkey(
                first_name, last_name, specialty, role
              )
            `)
            .eq('id', roomId)
            .maybeSingle();
          if (error) throw error;
          if (!data) {
            // Fallback — roomId is an appointments UUID. The Appointments
            // "Join" buttons link that way; resolve the appointment and mint
            // its consultation row idempotently.
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
              .select(`
                *,
                provider:profiles!video_consultations_provider_id_fkey(
                  first_name, last_name, specialty, role
                )
              `)
              .eq('notes', noteTag)
              .in('status', ['scheduled', 'active'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (existingError) throw existingError;
            if (existing) {
              found = existing;
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
                .select(`
                  *,
                  provider:profiles!video_consultations_provider_id_fkey(
                    first_name, last_name, specialty, role
                  )
                `)
                .single();
              if (mintError) throw mintError;
              found = minted;
            }
          } else {
            if (data.patient_id !== user.id && data.provider_id !== user.id) {
              setFatalError('You are not a participant in this consultation.');
              setLoading(false);
              return;
            }
            found = data;
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
            .select(`
              *,
              provider:profiles!video_consultations_provider_id_fkey(
                first_name, last_name, specialty, role
              )
            `)
            .single();
          if (error) throw error;
          found = data;
        }

        if (cancelled) return;
        setConsultation(found);
        setConsultationId(found.id);
      } catch (err: any) {
        console.error('Failed to load video consultation:', err);
        if (!cancelled) {
          setFatalError(
            friendlyErrorMessage(err, 'Could not load this visit. Check your connection and try again.')
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, roomId, searchParams]);

  // Step 2 — mint the Daily room and join, after the pre-visit checklist.
  const startCall = useCallback(async () => {
    if (!consultation || !consultationId || meetingUrl || startingCall) return;
    setStartingCall(true);
    setFatalError(null);
    try {
      // Always go through the function — even when the room already
      // exists. The room is private, so every participant needs a
      // meeting token minted for them; entering on meeting_url alone
      // is refused by Daily. The function also flips the visit
      // scheduled → active server-side (clients have no UPDATE policy
      // on video_consultations, so the old client-side status update
      // here silently changed nothing).
      toast.loading('Setting up your secure video room…');
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-daily-room', {
        body: { consultation_id: consultationId },
      });
      if (fnError) throw fnError;
      const url = (fnData as any)?.url;
      const token = (fnData as any)?.token;
      if (!url || !token) throw new Error('Video service did not return a room URL.');
      toast.dismiss();
      setMeetingUrl(url);
      setMeetingToken(token);

      setPreCheckDone(true);
      logAnalyticsEvent('video_call_opened', {
        consultation_id: consultationId,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Failed to start video call:', err);
      toast.dismiss();
      setFatalError(
        friendlyErrorMessage(err, 'Could not start the video call. Check your connection and try again.')
      );
    } finally {
      setStartingCall(false);
    }
  }, [consultation, consultationId, meetingUrl, startingCall, user]);

  // Am I the consultation's provider (host)? Decided from the
  // consultation row itself — the same test the server uses.
  const isConsultationProvider = !!user && !!consultation && consultation.provider_id === user.id;

  const navigateAfterCall = useCallback(() => {
    // Patients land on the post-visit summary; providers go to the list.
    // Role authority is user_roles (via UserRolesContext) — profiles.role
    // is a display artefact that defaults to 'patient' and must never
    // decide who owns a visit (P2-8); it is kept only as an OR fallback.
    const role = (profile?.role || '').toLowerCase();
    const isProviderRole =
      availableRoles.some((r) => (CONSULTABLE_PROVIDER_ROLES as string[]).includes(r)) ||
      (CONSULTABLE_PROVIDER_ROLES as string[]).includes(role);
    if (consultationId && !isProviderRole) {
      navigate(`/visit-summary/${consultationId}`, { replace: true });
    } else {
      navigate('/video-consultations', { replace: true });
    }
  }, [consultationId, profile, navigate, availableRoles]);

  // Plain leave: only I exit — the visit stays live for the other side
  // and I can rejoin. (This used to try to complete the visit from the
  // client for providers, but clients have no UPDATE policy on
  // video_consultations, so that write never landed. Ending for
  // everyone is the separate server-side action below.)
  const handleLeave = useCallback(async () => {
    logAnalyticsEvent('video_call_left', { consultation_id: consultationId });
    navigateAfterCall();
  }, [consultationId, navigateAfterCall]);

  // End the meeting for everyone (provider/host only; server enforces).
  const handleEndMeeting = useCallback(async () => {
    if (!consultationId) return;
    const { error } = await supabase.functions.invoke('end-video-consultation', {
      body: { consultation_id: consultationId },
    });
    if (error) {
      toast.error('We couldn\'t end the meeting. Please try again in a moment.');
      return;
    }
    logAnalyticsEvent('video_call_ended', { consultation_id: consultationId });
    toast.success('Meeting ended for everyone.');
    navigateAfterCall();
  }, [consultationId, navigateAfterCall]);

  // If the provider ends the meeting while I'm in it, leave the room
  // and land on the same post-call screen with a clear message.
  useEffect(() => {
    if (!consultationId || !preCheckDone) return;
    const channel = supabase
      .channel(`video-call-${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_consultations',
          filter: `id=eq.${consultationId}`,
        },
        (payload) => {
          const next = payload.new as { status?: string; ended_by?: string | null };
          if (next.ended_by && user && next.ended_by === user.id) return; // I ended it myself
          if (next.status === 'completed' || next.status === 'cancelled') {
            toast.info('The meeting has ended.');
            navigateAfterCall();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, preCheckDone, navigateAfterCall]);

  // Derived display values for the pre-visit screen.

  // Derived display values for the pre-visit screen.
  const providerName = consultation?.provider
    ? providerDisplayName({
        first_name: consultation.provider.first_name,
        last_name: consultation.provider.last_name,
        role: consultation.provider.role,
      })
    : 'Your doctor';
  const durationMinutes = (() => {
    if (!consultation?.scheduled_start || !consultation?.scheduled_end) return 30;
    return Math.max(
      5,
      Math.round(
        (new Date(consultation.scheduled_end).getTime() -
          new Date(consultation.scheduled_start).getTime()) /
          60000
      )
    );
  })();

  return (
    <ProtectedRoute>
      {loading ? (
        <LoadingScreen message="Preparing your visit…" />
      ) : fatalError ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
          <div className="max-w-sm w-full vf-card text-center space-y-4">
            <VideoOff className="h-10 w-10 mx-auto text-error-500" />
            <h1 className="text-xl text-midnight">Cannot join this visit</h1>
            <p className="text-sm text-graphite-500">{fatalError}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full min-h-[44px]">
                Try again
              </Button>
              <Button variant="outline" onClick={() => navigate('/video-consultations')} className="w-full min-h-[44px]">
                Back to Video Consultations
              </Button>
            </div>
          </div>
        </div>
      ) : !preCheckDone ? (
        <PreVisitChecklist
          providerName={providerName}
          specialty={consultation?.provider?.specialty}
          durationMinutes={durationMinutes}
          onJoin={startCall}
          onCancel={() => navigate('/video-consultations')}
        />
      ) : startingCall || !meetingUrl ? (
        <LoadingScreen message="Joining your visit…" />
      ) : (
        <VideoRoom
          roomUrl={meetingUrl}
          userName={userName}
          meetingToken={meetingToken || undefined}
          onLeave={handleLeave}
          consultationId={consultationId || undefined}
          isProvider={isConsultationProvider}
          onEndMeeting={handleEndMeeting}
        />
      )}
    </ProtectedRoute>
  );
};

export default VideoCall;
