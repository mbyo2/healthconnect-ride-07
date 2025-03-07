
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { VideoConsultationDetails } from "@/types/video";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ConsultationListProps {
  onJoinMeeting: (consultation: VideoConsultationDetails) => void;
}

export const ConsultationList = ({ onJoinMeeting }: ConsultationListProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 mt-1" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h1 className={`font-bold ${isMobile ? 'text-xl mb-2' : 'text-2xl mb-4'}`}>Video Consultations</h1>
      
      {consultations?.map((consultation) => (
        <Card 
          key={consultation.id} 
          className={`p-4 ${isMobile ? 'touch-manipulation active:bg-accent/10 transition-colors' : ''}`}
        >
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
            <div className={isMobile ? 'space-y-1' : ''}>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">
                  Dr. {consultation.provider.first_name} {consultation.provider.last_name}
                </h3>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <p>{format(new Date(consultation.scheduled_start), 'PPP')}</p>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <p>
                  {format(new Date(consultation.scheduled_start), 'p')} - 
                  {format(new Date(consultation.scheduled_end), 'p')}
                </p>
              </div>
              
              <p className={`text-sm capitalize ${isMobile ? 'mt-1' : 'mt-1'}`}>
                Status: <span className={`font-medium ${consultation.status === 'active' ? 'text-green-600 dark:text-green-400' : ''}`}>{consultation.status}</span>
              </p>
            </div>
            
            {consultation.meeting_url && consultation.status === 'active' && (
              <Button 
                onClick={() => onJoinMeeting(consultation)}
                className={`gap-2 ${isMobile ? 'w-full mt-2' : ''}`}
                size={isMobile ? "lg" : "default"}
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
