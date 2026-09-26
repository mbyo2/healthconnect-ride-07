import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { VideoConsultationDetails, ConsultationListProps } from "@/types/video";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Skeleton } from "@/components/ui/skeleton";
import { providerDisplayName } from "@/utils/providerDisplay";

/** Joinable while the visit is bookable or live — the Daily room is minted on demand.
 *  DB CHECK on video_consultations.status allows only
 *  ('scheduled','active','completed','cancelled'). */
const JOINABLE_STATUSES = ["scheduled", "active"];

export const ConsultationList = ({ onJoinMeeting }: ConsultationListProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Visit going live / cancelled elsewhere reflects here instantly.
  useEffect(() => {
    const channel = supabase
      .channel('video-consultations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_consultations' },
        () => queryClient.invalidateQueries({ queryKey: ['video-consultations'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['video-consultations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Both sides of the visit: patients see their doctors, providers see
      // their patient list (previously only the patient side was queried,
      // so providers saw an empty list).
      const { data, error } = await supabase
        .from('video_consultations')
        .select(`
          *,
          provider:profiles!video_consultations_provider_id_fkey(
            first_name,
            last_name,
            specialty,
            role
          ),
          patient:profiles!video_consultations_patient_id_fkey(
            first_name,
            last_name
          )
        `)
        .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('scheduled_start', { ascending: true });

      if (error) {
        console.error('Error fetching consultations:', error);
        throw error;
      }

      return { consultations: (data as any[]) || [], userId: user.id };
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

  if (isError) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground">We couldn&apos;t load your video visits. Check your connection and try again.</p>
        <Button variant="outline" className="h-11 min-h-[44px]" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const consultations = data?.consultations || [];
  const userId = data?.userId;

  return (
    <div className="grid gap-4">

      {consultations?.map((consultation: any) => {
        const isProviderSide = userId && consultation.provider_id === userId;
        const counterpart = isProviderSide
          ? `${consultation.patient?.first_name || ''} ${consultation.patient?.last_name || ''}`.trim() || 'Patient'
          : providerDisplayName({ first_name: consultation.provider?.first_name, last_name: consultation.provider?.last_name, role: (consultation.provider as any)?.role });
        const canJoin = JOINABLE_STATUSES.includes(consultation.status);

        return (
          <Card
            key={consultation.id}
            className={`p-4 ${isMobile ? 'touch-manipulation active:bg-accent/10 transition-colors' : ''}`}
          >
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
              <div className={isMobile ? 'space-y-1' : ''}>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">
                    {counterpart}
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
                  Status: <span className={`font-medium ${consultation.status === 'in-progress' || consultation.status === 'active' ? 'text-green-600 dark:text-green-400' : ''}`}>{String(consultation.status || '').replace(/-/g, ' ')}</span>
                </p>
              </div>

              {canJoin && (
                <Button
                  onClick={() => onJoinMeeting && onJoinMeeting(consultation as VideoConsultationDetails)}
                  className={`gap-2 ${isMobile ? 'w-full mt-2' : ''}`}
                  size={isMobile ? "lg" : "default"}
                >
                  <Video className="h-4 w-4" />
                  Join Meeting
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      {(!consultations || consultations.length === 0) && (
        <div className="text-center py-8 space-y-3">
          <p className="text-muted-foreground font-medium">No video consultations scheduled</p>
          <p className="text-sm text-muted-foreground">Book a video visit with a verified provider to get started.</p>
          <Button className="h-11 min-h-[44px]" onClick={() => navigate('/search')}>
            <Video className="h-4 w-4 mr-2" /> Find a provider
          </Button>
        </div>
      )}
    </div>
  );
};
