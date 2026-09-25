import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Clock, MapPin, CalendarX, RefreshCw, FileCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppointmentWithProvider } from "@/types/appointments";
import { providerDisplayName } from "@/utils/providerDisplay";

export const AppointmentsList = () => {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time, type, status, provider_id, notes')
        .eq('patient_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      // appointments.provider_id FKs point at auth.users (see migrations), so
      // a `profiles!appointments_provider_id_fkey` join hint is invalid and
      // patient sessions cannot read profiles rows — resolve providers from
      // the public provider_directory view instead.
      const providerIds = Array.from(
        new Set((data || []).map((a: any) => a.provider_id).filter(Boolean))
      );
      const providerMap: Record<string, any> = {};
      if (providerIds.length > 0) {
        const { data: dirs } = await supabase
          .from('provider_directory')
          .select('id, first_name, last_name, specialty, role, location, city')
          .in('id', providerIds);
        (dirs || []).forEach((d: any) => {
          providerMap[d.id] = d;
        });
      }

      const enriched = (data || []).map((a: any) => ({
        ...a,
        provider: {
          first_name: providerMap[a.provider_id]?.first_name ?? '',
          last_name: providerMap[a.provider_id]?.last_name ?? '',
          specialty: providerMap[a.provider_id]?.specialty ?? undefined,
          role: providerMap[a.provider_id]?.role ?? undefined,
          address:
            [providerMap[a.provider_id]?.location, providerMap[a.provider_id]?.city]
              .filter(Boolean)
              .join(', ') || undefined,
        },
      }));
      return enriched as AppointmentWithProvider[];
    }
  });

  const cancelAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Appointment cancelled successfully');
      refetch();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  if (isLoading) {
    return <ListSkeleton count={3} showAvatar />;
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No upcoming appointments"
        description="Book a new appointment to see a healthcare provider"
      />
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold">
                {providerDisplayName({ first_name: appointment.provider.first_name, last_name: appointment.provider.last_name, role: (appointment.provider as any)?.role })}
              </h3>
              <p className="text-muted-foreground">{appointment.provider.specialty}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(appointment.date), 'MMMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{appointment.time}</span>
              </div>
              {appointment.type === 'physical' && appointment.provider.address && (
                <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span>{appointment.provider.address}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.provider.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs mt-1"
                    >
                      Get Directions →
                    </a>
                  </div>
                </div>
              )}
              <Badge
                variant={
                  appointment.status === 'scheduled' ? 'default' : 
                  appointment.status === 'completed' ? 'secondary' : 'destructive'
                }
                className="mt-2"
              >
                {appointment.status}
              </Badge>
            </div>
            <div className="flex flex-col w-full md:w-auto gap-2">
              {appointment.status === 'scheduled' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/search?reschedule=${appointment.id}&provider=${appointment.provider_id}`)}
                    className="w-full gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/intake-form?appointment=${appointment.id}`)}
                    className="w-full gap-1"
                  >
                    <FileCheck className="h-3 w-3" />
                    Intake Form
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => cancelAppointment(appointment.id)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
