
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { VideoConsultationDetails } from "@/types/video";
import { ConsultationList } from "./ConsultationList";
import { VideoRoom } from "./VideoRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNetwork } from "@/hooks/use-network";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Signal, Wifi, WifiOff, Tv, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useIsTVDevice } from "@/hooks/use-tv-detection";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const VideoConsultation = () => {
  const [activeConsultation, setActiveConsultation] = useState<VideoConsultationDetails | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // A failed join shows ONE plain message with a manual retry button.
  // (The previous version auto-retried a deterministic server failure
  // three times with a fresh toast each round — the "errors non stop"
  // loop reported 2026-11-20.)
  const [joinError, setJoinError] = useState<{ consultation: VideoConsultationDetails; message: string } | null>(null);
  const [meetingEnded, setMeetingEnded] = useState<"by-me" | "by-other" | null>(null);
  const [searchParams] = useSearchParams();
  const { isOnline, connectionQuality } = useNetwork();
  const isTV = useIsTVDevice();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, profile } = useAuth();
  const { handleError } = useErrorHandler();
  const endedByMeRef = useRef(false);

  useEffect(() => {
    // Set focus on first focusable element for TV remote navigation
    if (isTV) {
      const focusableElements = document.querySelectorAll('[data-dpad-focusable="true"]');
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isTV, activeConsultation]);

  // The room is private: the function creates/reuses it AND mints a
  // meeting token for THIS participant. Both are needed on every
  // join — entering on meeting_url alone is refused by Daily.
  const invokeRoom = useCallback((consultation: VideoConsultationDetails) =>
    supabase.functions.invoke('create-daily-room', {
      body: {
        consultation_id: consultation.id,
        optimize_for_network: connectionQuality === "poor",
        tv_mode: isTV,
        enable_recording: true // Server honours this for the provider only
      }
    }).then(({ data, error }) => {
      if (error) throw error;
      if (!data?.url || !data?.token) {
        throw new Error("The video room could not be set up.");
      }
      return data;
    }), [connectionQuality, isTV]);

  // Join latency (Zoom-parity pass): warm the room + token up ahead of
  // the click — the list fires this for consultations inside their
  // window and on Join intent (pointer down), so the actual click is
  // usually instant. One in-flight promise per consultation; a failed
  // prefetch is dropped so the click path invokes fresh (once, with
  // the manual-retry error UI — never a retry loop).
  const prefetchRef = useRef(new Map<string, Promise<any>>());
  const prefetchJoin = useCallback((consultation: VideoConsultationDetails) => {
    if (!isOnline) return;
    if (prefetchRef.current.has(consultation.id)) return;
    const p = invokeRoom(consultation);
    p.catch(() => {
      prefetchRef.current.delete(consultation.id);
    });
    prefetchRef.current.set(consultation.id, p);
  }, [invokeRoom, isOnline]);

  const handleJoinMeeting = useCallback(async (consultation: VideoConsultationDetails) => {
    // Check for network status before joining
    if (!isOnline) {
      toast.error("You are offline. Cannot join meeting.");
      return;
    }

    // Warn about low quality connection
    if (connectionQuality === "poor") {
      toast.warning("Your connection quality is poor. Video quality will be reduced.");
    }

    setJoinError(null);
    setMeetingEnded(null);
    endedByMeRef.current = false;
    setIsLoading(true);
    const loadingToast = toast.loading("Setting up your video room...");

    try {
      let data: any = null;
      const cached = prefetchRef.current.get(consultation.id);
      if (cached) {
        try {
          data = await cached;
        } catch {
          data = null; // prefetch failed — fall through to a fresh invoke
        }
      }
      if (!data) {
        data = await invokeRoom(consultation);
      }

      toast.dismiss(loadingToast);
      setIsLoading(false);

      setMeetingToken(data.token as string);
      setActiveConsultation({
        ...consultation,
        meeting_url: data.url as string,
        status: (data.status as string) || consultation.status,
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      setIsLoading(false);
      handleError(error, "Failed to join meeting");
      setJoinError({
        consultation,
        message: "We couldn't set up the video room just now. Your visit is still booked — please try again.",
      });
    }
  }, [isOnline, connectionQuality, invokeRoom, handleError]);

  const handleLeaveCall = useCallback(() => {
    setActiveConsultation(null);
    setMeetingToken(null);
  }, []);

  // End the meeting for everyone (provider only — the room component
  // only renders the button for the provider; the server enforces it).
  const handleEndMeeting = useCallback(async () => {
    if (!activeConsultation) return;
    try {
      const { error } = await supabase.functions.invoke('end-video-consultation', {
        body: { consultation_id: activeConsultation.id },
      });
      if (error) throw error;
      endedByMeRef.current = true;
      setMeetingEnded("by-me");
      setActiveConsultation(null);
      setMeetingToken(null);
      toast.success("Meeting ended for everyone.");
    } catch (error) {
      handleError(error, "Failed to end meeting");
    }
  }, [activeConsultation, handleError]);

  // While in a call, watch the consultation row: when the provider ends
  // the meeting, this side exits and shows the ended state. (The Daily
  // room is also deleted server-side, so nobody can linger in it.)
  useEffect(() => {
    if (!activeConsultation) return;
    const channel = supabase
      .channel(`video-consultation-${activeConsultation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_consultations',
          filter: `id=eq.${activeConsultation.id}`,
        },
        (payload) => {
          const next = payload.new as { status?: string };
          if ((next.status === 'completed' || next.status === 'cancelled') && !endedByMeRef.current) {
            setMeetingEnded("by-other");
            setActiveConsultation(null);
            setMeetingToken(null);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConsultation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-join from ?join=<consultation_id> (e.g. from Appointment Details page).
  useEffect(() => {
    const joinId = searchParams.get('join');
    if (!joinId || activeConsultation) return;

    (async () => {
      const { data, error } = await supabase
        .from('video_consultations')
        .select(`
          *,
          provider:profiles!video_consultations_provider_id_fkey(first_name, last_name, specialty),
          patient:profiles!video_consultations_patient_id_fkey(first_name, last_name)
        `)
        .eq('id', joinId)
        .maybeSingle();

      if (!error && data) {
        handleJoinMeeting(data as VideoConsultationDetails);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When connection is lost during a call — calm, plain-language, with a path back.
  useEffect(() => {
    if (activeConsultation && !isOnline) {
      toast.error("Your connection dropped — this happens sometimes.", {
        description: "Your visit is still booked. Rejoin when you're back online.",
        duration: 15000,
        id: "connection-lost-call",
        action: {
          label: "Rejoin visit",
          onClick: () => {
            const c = activeConsultation;
            setActiveConsultation(null);
            setTimeout(() => handleJoinMeeting(c), 500);
          },
        },
      });
    }
  }, [isOnline, activeConsultation, handleJoinMeeting]);

  // Use profile data for user name, falling back to user email
  const userName = useMemo(() =>
    profile?.first_name || (user?.email ? user.email.split('@')[0] : "User"),
    [profile, user]
  );

  const isProvider = !!user && !!activeConsultation && activeConsultation.provider_id === user.id;

  // Plain display name of the other party (no title prefix — Doc'O
  // Clock covers 27 provider professions). Used by the waiting state
  // and the visit info panel.
  const peerName = (() => {
    if (!activeConsultation) return undefined;
    const other: any = isProvider ? (activeConsultation as any).patient : activeConsultation.provider;
    const n = `${other?.first_name ?? ''} ${other?.last_name ?? ''}`.trim();
    return n || undefined;
  })();

  return (
    <div className={cn(
      "container mx-auto py-6",
      isTV ? 'tv-container p-8' : '',
      isMobile ? 'px-2 py-4' : '',
      "transition-all duration-300"
    )}>
      {isMobile && activeConsultation && (
        <Button
          variant="ghost"
          onClick={handleLeaveCall}
          className="mb-4 -ml-2 flex items-center text-trust-500 h-11 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to consultations
        </Button>
      )}

      {isTV && !activeConsultation && (
        <div className="tv-indicator mb-6 p-4 flex items-center justify-center bg-muted rounded-lg">
          <Tv className="h-6 w-6 mr-3 text-primary" />
          <span className="text-xl text-foreground">TV Mode Active - Use remote control for navigation</span>
        </div>
      )}

      {!isOnline && (
        <Alert variant="destructive" className={cn(
          "mb-4",
          isTV ? 'p-4 text-lg' : '',
          isMobile ? 'p-3' : '',
          "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800"
        )}>
          <WifiOff className={isTV ? "h-6 w-6" : "h-4 w-4"} />
          <AlertTitle className={isTV ? "text-xl" : ""}>Connection Lost</AlertTitle>
          <AlertDescription className={isTV ? "text-lg" : ""}>
            You are currently offline. Please reconnect to join video consultations.
          </AlertDescription>
        </Alert>
      )}

      {isOnline && connectionQuality === "poor" && !activeConsultation && (
        <Alert className={cn(
          "mb-4",
          isTV ? 'p-4 text-lg' : '',
          isMobile ? 'p-3' : '',
          "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800"
        )}>
          <Signal className={isTV ? "h-6 w-6" : "h-4 w-4"} />
          <AlertTitle className={isTV ? "text-xl" : ""}>Poor Connection</AlertTitle>
          <AlertDescription className={isTV ? "text-lg" : ""}>
            Your network connection is weak. Video quality will be reduced to maintain stability.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-4 p-6 bg-card rounded-xl border shadow-soft-blue animate-pulse">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full bg-trust-100" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px] bg-trust-100" />
              <Skeleton className="h-3 w-[150px] bg-trust-100" />
            </div>
          </div>
          <Skeleton className="h-[200px] w-full rounded-lg bg-trust-100" />
          <div className="flex justify-center space-x-2">
            <Skeleton className="h-9 w-24 rounded-md bg-trust-100" />
            <Skeleton className="h-9 w-24 rounded-md bg-trust-100" />
          </div>
        </div>
      )}

      {!isLoading && joinError && !activeConsultation && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <AlertTitle>We couldn&apos;t start the video just now</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col gap-3">
            <span>{joinError.message}</span>
            <span>
              <Button
                className="min-h-[44px]"
                onClick={() => handleJoinMeeting(joinError.consultation)}
              >
                Try again
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && meetingEnded && !activeConsultation && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">The meeting has ended</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {meetingEnded === "by-me"
              ? "You ended this visit for everyone. The consultation is now marked completed."
              : "The provider has ended this visit. Thank you for attending."}
          </p>
          <Button className="mt-4 min-h-[44px]" variant="outline" onClick={() => setMeetingEnded(null)}>
            Back to consultations
          </Button>
        </div>
      )}

      {!isLoading && activeConsultation?.meeting_url && meetingToken ? (
        <VideoRoom
          roomUrl={activeConsultation.meeting_url}
          meetingToken={meetingToken}
          userName={userName}
          videoQuality={connectionQuality === "poor" ? "low" : "medium"}
          onLeave={handleLeaveCall}
          consultationId={activeConsultation.id}
          isProvider={isProvider}
          peerName={peerName}
          onEndMeeting={handleEndMeeting}
        />
      ) : !isLoading && (
        <ConsultationList onJoinMeeting={handleJoinMeeting} onPrefetch={prefetchJoin} />
      )}
    </div>
  );
};
