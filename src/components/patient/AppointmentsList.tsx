
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppointmentWithProvider } from "@/types/appointments";

export const AppointmentsList = () => {
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          provider:profiles!appointments_provider_id_fkey (
            first_name,
            last_name,
            specialty,
            address
          )
        `)
        .eq('patient_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data as AppointmentWithProvider[];
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
    return <LoadingSpinner />;
  }

  if (appointments.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No upcoming appointments scheduled</p>
        <p className="text-sm text-muted-foreground mt-2">Book a new appointment to see a healthcare provider</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold">
                Dr. {appointment.provider.first_name} {appointment.provider.last_name}
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
              <Button
                variant="destructive"
                onClick={() => cancelAppointment(appointment.id)}
                disabled={appointment.status !== 'scheduled'}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
