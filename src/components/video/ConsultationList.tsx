import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { format } from "date-fns";
import { VideoConsultationDetails } from "@/types/video";

interface ConsultationListProps {
  onJoinMeeting: (consultation: VideoConsultationDetails) => void;
}

export const ConsultationList = ({ onJoinMeeting }: ConsultationListProps) => {
  const { data: consultations, isLoading } = useQuery({
    queryKey: ['video-consultations'],
    queryFn: async () => {
      console.log('Fetching video consultations');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('video_consultations')
        .select(`
          *,
          provider:profiles!video_consultations_provider_id_fkey(
            first_name,
            last_name,
            specialty
          )
        `)
        .eq('patient_id', user.id)
        .order('scheduled_start', { ascending: true });

      if (error) {
        console.error('Error fetching consultations:', error);
        throw error;
      }
      
      console.log('Fetched consultations:', data);
      return data as VideoConsultationDetails[];
    }
  });

  if (isLoading) {
    return <div>Loading consultations...</div>;
  }

  return (
    <div className="grid gap-4">
      {consultations?.map((consultation) => (
        <Card key={consultation.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Dr. {consultation.provider.first_name} {consultation.provider.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(consultation.scheduled_start), 'PPP p')} - 
                {format(new Date(consultation.scheduled_end), 'p')}
              </p>
              <p className="text-sm capitalize mt-1">
                Status: <span className="font-medium">{consultation.status}</span>
              </p>
            </div>
            {consultation.meeting_url && consultation.status === 'active' && (
              <Button 
                onClick={() => onJoinMeeting(consultation)}
                className="gap-2"
              >
                <Video className="h-4 w-4" />
                Join Meeting
              </Button>
            )}
          </div>
        </Card>
      ))}

      {(!consultations || consultations.length === 0) && (
        <div className="text-center text-muted-foreground py-8">
          No video consultations scheduled
        </div>
      )}
    </div>
  );
};