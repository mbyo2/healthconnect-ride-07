import { useEffect, useState, useRef } from "react";
import DailyIframe from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Video, Calendar as CalendarIcon, MonitorUp, Mic, MicOff, Camera, CameraOff } from "lucide-react";
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const callFrameRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

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
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, []);

  const initializeVideoCall = async (meetingUrl: string) => {
    if (!videoContainerRef.current) return;

    try {
      const callFrame = DailyIframe.createFrame(videoContainerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '12px',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      callFrameRef.current = callFrame;

      await callFrame.join({ url: meetingUrl });

      callFrame.on('left-meeting', () => {
        toast.info("Left the video consultation");
        if (callFrameRef.current) {
          callFrameRef.current.destroy();
          callFrameRef.current = null;
        }
      });

    } catch (error: any) {
      toast.error("Error joining video call: " + error.message);
    }
  };

  const toggleScreenShare = async () => {
    if (!callFrameRef.current) return;

    try {
      if (isScreenSharing) {
        await callFrameRef.current.stopScreenShare();
      } else {
        await callFrameRef.current.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error: any) {
      toast.error("Error toggling screen share: " + error.message);
    }
  };

  const toggleMute = () => {
    if (!callFrameRef.current) return;
    callFrameRef.current.setLocalAudio(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!callFrameRef.current) return;
    callFrameRef.current.setLocalVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
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

      {/* Video Container */}
      <div 
        ref={videoContainerRef} 
        className="w-full aspect-video bg-gray-100 rounded-lg mb-4"
      />

      {/* Video Controls */}
      {callFrameRef.current && (
        <div className="flex justify-center gap-4 mb-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleVideo}
          >
            {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          </Button>
          <Button
            variant={isScreenSharing ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleScreenShare}
          >
            <MonitorUp className="h-4 w-4" />
          </Button>
        </div>
      )}

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
                  onClick={() => initializeVideoCall(consultation.meeting_url!)}
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