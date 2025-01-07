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
      if (!consultation.url) {
        const { error } = await supabase.functions.invoke('create-daily-room', {
          body: { consultation_id: consultation.id }
        });

        if (error) throw error;
      }
      
      setActiveConsultation(consultation);
    } catch (error: any) {
      toast.error("Failed to join meeting: " + error.message);
    }
  };

  return (
    <div className="container mx-auto py-6">
      {activeConsultation?.url ? (
        <VideoRoom meetingUrl={activeConsultation.url} />
      ) : (
        <ConsultationList onJoinMeeting={handleJoinMeeting} />
      )}
    </div>
  );
};