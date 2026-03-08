import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, parseISO, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentWithProvider } from "@/types/appointments";
import { useCallback, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";
import { useApiQuery } from "@/hooks/use-api-query";
import { useUserRoles } from "@/context/UserRolesContext";
import { 
  Calendar, Clock, Video, MapPin, FileText, CalendarPlus, 
  ArrowRight, Phone, CheckCircle, Stethoscope
} from "lucide-react";

const AppointmentsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const { isPatient, isHealthPersonnel, availableRoles } = useUserRoles();

  // Determine if user is a provider (doctor, nurse, health_personnel, radiologist)
  const isProvider = availableRoles.some(r => 
    ['health_personnel', 'doctor', 'nurse', 'radiologist'].includes(r)
  );

  const { data: appointments = [], isLoading } = useApiQuery<any[]>(
    ['appointments', isProvider ? 'provider' : 'patient'],
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (isProvider) {
        // Provider view: show appointments where user is the provider
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:profiles!appointments_patient_id_fkey (
              first_name, last_name, avatar_url, phone
            )
          `)
          .eq('provider_id', user.id)
          .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
      } else {
        // Patient view: show appointments where user is the patient
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            provider:profiles!appointments_provider_id_fkey (
              first_name, last_name, specialty, avatar_url, phone, address
            )
          `)
          .eq('patient_id', user.id)
          .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      errorMessage: "Failed to load appointments"
    }
  );

  // Real-time subscription for appointment status changes
  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const prev = queryClient.getQueryData(['appointments', isProvider ? 'provider' : 'patient']);
      queryClient.setQueryData(['appointments', isProvider ? 'provider' : 'patient'], (old: any[] | undefined) =>
        (old || []).map(a => a.id === appointmentId ? { ...a, status: 'cancelled' } : a)
      );
      return { prev };
    },
    onSuccess: () => toast.success('Appointment cancelled'),
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['appointments', isProvider ? 'provider' : 'patient'], ctx.prev);
      toast.error('Failed to cancel appointment');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const completeAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Appointment marked as completed');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => toast.error('Failed to update appointment'),
  });

  const now = new Date();
  const upcoming = useMemo(() => 
    appointments.filter(a => !isPast(parseISO(a.date)) && a.status !== 'cancelled' && a.status !== 'completed')
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [appointments]
  );
  const past = useMemo(() =>
    appointments.filter(a => isPast(parseISO(a.date)) || a.status === 'completed' || a.status === 'cancelled')
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
    [appointments]
  );
  const todayAppts = useMemo(() =>
    appointments.filter(a => isToday(parseISO(a.date)) && a.status !== 'cancelled'),
    [appointments]
  );

  const renderAppointmentCard = (appointment: any) => {
    const person = isProvider ? appointment.patient : appointment.provider;
    const isVideo = appointment.type === 'video_consultation';
    const apptDate = parseISO(appointment.date);
    const isUpcoming = !isPast(apptDate) && appointment.status !== 'cancelled' && appointment.status !== 'completed';
    const isTodayAppt = isToday(apptDate);

    return (
      <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow border">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {person?.avatar_url ? (
              <img src={person.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {person?.first_name?.[0]}{person?.last_name?.[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">
                  {isProvider ? '' : 'Dr. '}{person?.first_name} {person?.last_name}
                </h3>
                {!isProvider && person?.specialty && (
                  <p className="text-sm text-primary">{person.specialty}</p>
                )}
              </div>
              <Badge
                variant={
                  appointment.status === 'cancelled' ? 'destructive' :
                  appointment.status === 'completed' ? 'outline' : 'default'
                }
                className={appointment.status === 'scheduled' ? 'bg-primary' : ''}
              >
                {appointment.status}
              </Badge>
            </div>

            {/* Date/Time/Type */}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {isTodayAppt ? 'Today' : format(apptDate, 'EEE, MMM d')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {appointment.time}
              </span>
              <span className="flex items-center gap-1">
                {isVideo ? <Video className="h-3.5 w-3.5 text-emerald-600" /> : <MapPin className="h-3.5 w-3.5 text-blue-600" />}
                {isVideo ? 'Video' : 'In-Person'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" asChild>
                <Link to={`/appointments/${appointment.id}`}>Details</Link>
              </Button>

              {isUpcoming && isVideo && isTodayAppt && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" asChild>
                  <Link to={`/video-call/${appointment.id}`}>
                    <Video className="h-3.5 w-3.5" />
                    {isProvider ? 'Start Call' : 'Join Call'}
                  </Link>
                </Button>
              )}

              {isUpcoming && !isProvider && (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/intake-form?appointment=${appointment.id}`)}>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Intake Form
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelAppointment.mutate(appointment.id)}
                  >
                    Cancel
                  </Button>
                </>
              )}

              {isUpcoming && isProvider && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                    onClick={() => completeAppointment.mutate(appointment.id)}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/prescriptions`)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Prescribe
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelAppointment.mutate(appointment.id)}
                  >
                    Cancel
                  </Button>
                </>
              )}

              {appointment.status === 'completed' && !isProvider && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/provider/${appointment.provider_id}`)}>
                  Book Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <NetworkErrorBoundary>
      <div className="container mx-auto px-4 py-6 bg-background min-h-screen max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isProvider ? 'Patient Appointments' : 'My Appointments'}
            </h1>
            {isProvider && (
              <p className="text-sm text-muted-foreground mt-1">Manage your patient consultations</p>
            )}
          </div>
          {!isProvider && (
            <Button onClick={() => navigate('/search')} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Book New
            </Button>
          )}
        </div>

        {/* Today's highlight */}
        {todayAppts.length > 0 && (
          <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Today's Appointments ({todayAppts.length})</h2>
            </div>
            <div className="space-y-3">
              {todayAppts.map(renderAppointmentCard)}
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upcoming">
                Upcoming ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({past.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {upcoming.length === 0 ? (
                <Card className="p-8 text-center border">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    {isProvider ? 'No upcoming patient appointments' : 'No upcoming appointments'}
                  </p>
                  {!isProvider && (
                    <Button asChild>
                      <Link to="/search">Find a Doctor</Link>
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-3">{upcoming.map(renderAppointmentCard)}</div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {past.length === 0 ? (
                <Card className="p-8 text-center border">
                  <p className="text-muted-foreground">No past appointments</p>
                </Card>
              ) : (
                <div className="space-y-3">{past.map(renderAppointmentCard)}</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </NetworkErrorBoundary>
  );
};

export default AppointmentsPage;
