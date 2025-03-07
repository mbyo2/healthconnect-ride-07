
import { useState } from "react";
import { VideoConsultationDetails } from "@/types/video";
import { ConsultationList } from "./ConsultationList";
import { VideoRoom } from "./VideoRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNetwork } from "@/hooks/use-network";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Signal, Wifi, WifiOff } from "lucide-react";

export const VideoConsultation = () => {
  const [activeConsultation, setActiveConsultation] = useState<VideoConsultationDetails | null>(null);
  const { isOnline, connectionQuality, connectionType } = useNetwork();

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
        
        const { error } = await supabase.functions.invoke('create-daily-room', {
          body: { 
            consultation_id: consultation.id,
            optimize_for_network: connectionQuality === "poor" || connectionType === "cellular"
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
    <div className="container mx-auto py-6">
      {!isOnline && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Connection Lost</AlertTitle>
          <AlertDescription>
            You are currently offline. Please reconnect to join video consultations.
          </AlertDescription>
        </Alert>
      )}
      
      {isOnline && connectionQuality === "poor" && (
        <Alert variant="warning" className="mb-4">
          <Signal className="h-4 w-4" />
          <AlertTitle>Poor Connection</AlertTitle>
          <AlertDescription>
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
