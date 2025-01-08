import { useState } from "react";
import { VideoConsultationDetails } from "@/types/video";
import { ConsultationList } from "./ConsultationList";
import { VideoRoom } from "./VideoRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const VideoConsultation = () => {
  const [activeConsultation, setActiveConsultation] = useState<VideoConsultationDetails | null>(null);

  const handleJoinMeeting = async (consultation: VideoConsultationDetails) => {
    try {
      if (!consultation.meeting_url) {
        console.log('Creating new Daily room for consultation:', consultation.id);
        const { error } = await supabase.functions.invoke('create-daily-room', {
          body: { consultation_id: consultation.id }
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
      {activeConsultation?.meeting_url ? (
        <VideoRoom meetingUrl={activeConsultation.meeting_url} />
      ) : (
        <ConsultationList onJoinMeeting={handleJoinMeeting} />
      )}
    </div>
  );
};