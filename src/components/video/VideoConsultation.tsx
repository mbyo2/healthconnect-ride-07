
import { useState, useEffect } from "react";
import { VideoConsultationDetails } from "@/types/video";
import { ConsultationList } from "./ConsultationList";
import { VideoRoom } from "./VideoRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNetwork } from "@/hooks/use-network";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Signal, Wifi, WifiOff, Tv } from "lucide-react";
import { useIsTVDevice } from "@/hooks/use-tv-detection";

export const VideoConsultation = () => {
  const [activeConsultation, setActiveConsultation] = useState<VideoConsultationDetails | null>(null);
  const { isOnline, connectionQuality, connectionType } = useNetwork();
  const isTV = useIsTVDevice();

  useEffect(() => {
    // Set focus on first focusable element for TV remote navigation
    if (isTV) {
      const focusableElements = document.querySelectorAll('[data-dpad-focusable="true"]');
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isTV, activeConsultation]);

  const handleJoinMeeting = async (consultation: VideoConsultationDetails) => {
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
        
        // Inform user about network usage
        if (connectionType === "cellular") {
          toast.info("Using cellular data for video call. Data charges may apply.");
        }
        
        // Add TV-specific configuration if on a TV device
        const { error } = await supabase.functions.invoke('create-daily-room', {
          body: { 
            consultation_id: consultation.id,
            optimize_for_network: connectionQuality === "poor" || connectionType === "cellular",
            tv_mode: isTV
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

        setActiveConsultation(updatedConsultation as VideoConsultationDetails);
      } else {
        setActiveConsultation(consultation);
      }
    } catch (error: any) {
      console.error('Failed to join meeting:', error);
      toast.error("Failed to join meeting: " + error.message);
    }
  };

  return (
    <div className={`container mx-auto py-6 ${isTV ? 'tv-container p-8' : ''}`}>
      {isTV && !activeConsultation && (
        <div className="tv-indicator mb-6 p-4 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Tv className="h-6 w-6 mr-3" />
          <span className="text-xl">TV Mode Active - Use remote control for navigation</span>
        </div>
      )}
      
      {!isOnline && (
        <Alert variant="destructive" className={`mb-4 ${isTV ? 'p-4 text-lg' : ''}`}>
          <WifiOff className={isTV ? "h-6 w-6" : "h-4 w-4"} />
          <AlertTitle className={isTV ? "text-xl" : ""}>Connection Lost</AlertTitle>
          <AlertDescription className={isTV ? "text-lg" : ""}>
            You are currently offline. Please reconnect to join video consultations.
          </AlertDescription>
        </Alert>
      )}
      
      {isOnline && connectionQuality === "poor" && (
        <Alert className={`mb-4 ${isTV ? 'p-4 text-lg' : ''}`}>
          <Signal className={isTV ? "h-6 w-6" : "h-4 w-4"} />
          <AlertTitle className={isTV ? "text-xl" : ""}>Poor Connection</AlertTitle>
          <AlertDescription className={isTV ? "text-lg" : ""}>
            Your network connection is weak. Video quality will be reduced to maintain stability.
          </AlertDescription>
        </Alert>
      )}
      
      {activeConsultation?.meeting_url ? (
        <VideoRoom meetingUrl={activeConsultation.meeting_url} />
      ) : (
        <ConsultationList onJoinMeeting={handleJoinMeeting} />
      )}
    </div>
  );
};
