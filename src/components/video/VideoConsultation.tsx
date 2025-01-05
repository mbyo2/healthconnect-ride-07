import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Video, Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VideoCall } from "@/types/communication";

export const VideoConsultation = () => {
  const [consultations, setConsultations] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('video_consultations')
          .select(`
            *,
            provider:profiles!video_consultations_provider_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('patient_id', user.id)
          .order('scheduled_start', { ascending: true });

        if (error) throw error;
        setConsultations(data);
      } catch (error: any) {
        toast.error("Error fetching consultations: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();

    // Subscribe to consultation updates
    const channel = supabase
      .channel('video_consultations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'video_consultations' },
        (payload) => {
          console.log('Video consultation update:', payload);
          fetchConsultations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const joinMeeting = (meetingUrl: string) => {
    window.open(meetingUrl, '_blank');
  };

  if (loading) {
    return <div>Loading consultations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Video Consultations</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {date ? format(date, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4">
        {consultations.map((consultation) => (
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
                  onClick={() => joinMeeting(consultation.meeting_url!)}
                  className="gap-2"
                >
                  <Video className="h-4 w-4" />
                  Join Meeting
                </Button>
              )}
            </div>
          </Card>
        ))}

        {consultations.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No video consultations scheduled
          </div>
        )}
      </div>
    </div>
  );
};