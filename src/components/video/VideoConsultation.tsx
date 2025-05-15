
import { useState, useEffect, useCallback, useMemo } from "react";
import { VideoConsultationDetails } from "@/types/video";
import { ConsultationList } from "./ConsultationList";
import { VideoRoom } from "./VideoRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNetwork } from "@/hooks/use-network";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Signal, Wifi, WifiOff, Tv, ArrowLeft } from "lucide-react";
import { useIsTVDevice } from "@/hooks/use-tv-detection";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const VideoConsultation = () => {
  const [activeConsultation, setActiveConsultation] = useState<VideoConsultationDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline, connectionQuality } = useNetwork();
  const isTV = useIsTVDevice();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, profile } = useAuth();
  const { handleError } = useErrorHandler();
  const maxRetries = 3;

  useEffect(() => {
    // Set focus on first focusable element for TV remote navigation
    if (isTV) {
      const focusableElements = document.querySelectorAll('[data-dpad-focusable="true"]');
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isTV, activeConsultation]);

  const handleJoinMeeting = useCallback(async (consultation: VideoConsultationDetails) => {
    try {
      // Check for network status before joining
      if (!isOnline) {
        toast.error("You are offline. Cannot join meeting.");
        return;
      }

      // Warn about low quality connection
      if (connectionQuality === "poor") {
        toast.warning("Your connection quality is poor. Video quality will be reduced.");
      }

      if (!consultation.meeting_url) {
        console.log('Creating new Daily room for consultation:', consultation.id);
        
        // Show loading state
        setIsLoading(true);
        toast.loading("Setting up your video room...");
        
        try {
          // Add TV-specific configuration if on a TV device
          const { error } = await supabase.functions.invoke('create-daily-room', {
            body: { 
              consultation_id: consultation.id,
              optimize_for_network: connectionQuality === "poor",
              tv_mode: isTV,
              enable_recording: true // Enable recording for this room
            }
          });

          if (error) {
            console.error('Error creating Daily room:', error);
            throw error;
          }

          // Fetch the updated consultation with the new meeting URL
          const { data: updatedConsultation, error: fetchError } = await supabase
            .from('video_consultations')
            .select(`
              *,
              provider:profiles!video_consultations_provider_id_fkey(
                first_name,
                last_name,
                specialty
              )
            `)
            .eq('id', consultation.id)
            .single();

          if (fetchError) {
            console.error('Error fetching updated consultation:', fetchError);
            throw fetchError;
          }

          toast.dismiss();
          setIsLoading(false);
          setActiveConsultation(updatedConsultation as VideoConsultationDetails);
        } catch (error) {
          setIsLoading(false);
          toast.dismiss();
          handleError(error, "Failed to create video room");
          
          // Only retry if under max retry count
          if (retryCount < maxRetries) {
            toast.info(`Retrying... (${retryCount + 1}/${maxRetries})`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => handleJoinMeeting(consultation), 2000);
          } else {
            toast.error(`Failed after ${maxRetries} attempts. Please try again later.`);
            setRetryCount(0);
          }
        }
      } else {
        setActiveConsultation(consultation);
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Failed to join meeting:', error);
      handleError(error, "Failed to join meeting");
    }
  }, [isOnline, connectionQuality, isTV, handleError, retryCount, maxRetries]);
  
  const handleLeaveCall = useCallback(() => {
    setActiveConsultation(null);
    setRetryCount(0); // Reset retry counter
  }, []);
  
  // When connection is lost during a call
  useEffect(() => {
    if (activeConsultation && !isOnline) {
      toast.error("Connection lost during video call", {
        duration: 10000,
        id: "connection-lost-call"
      });
    }
  }, [isOnline, activeConsultation]);

  // Use profile data for user name, falling back to user email
  const userName = useMemo(() => 
    profile?.first_name || (user?.email ? user.email.split('@')[0] : "User"), 
    [profile, user]
  );

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
          size="sm" 
          onClick={handleLeaveCall}
          className="mb-4 -ml-2 flex items-center text-trust-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to consultations
        </Button>
      )}
      
      {isTV && !activeConsultation && (
        <div className="tv-indicator mb-6 p-4 flex items-center justify-center bg-trust-100 dark:bg-trust-900/50 rounded-lg">
          <Tv className="h-6 w-6 mr-3 text-trust-500" />
          <span className="text-xl text-trust-700 dark:text-trust-300">TV Mode Active - Use remote control for navigation</span>
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
      
      {isOnline && connectionQuality === "poor" && (
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
      
      {!isLoading && activeConsultation?.meeting_url ? (
        <VideoRoom 
          roomUrl={activeConsultation.meeting_url}
          userName={userName} 
          videoQuality={connectionQuality === "poor" ? "low" : "medium"}
          onLeave={handleLeaveCall}
        />
      ) : !isLoading && (
        <ConsultationList onJoinMeeting={handleJoinMeeting} />
      )}
    </div>
  );
};
