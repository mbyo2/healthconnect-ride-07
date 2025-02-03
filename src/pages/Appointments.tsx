import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentWithProvider } from "@/types/appointments";

const AppointmentsPage = () => {
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithProvider[]>({
    queryKey: ['appointments'],
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
            specialty
          )
        `)
        .eq('patient_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as AppointmentWithProvider[];
    }
  });

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled successfully');
    },
    onError: () => {
      toast.error('Failed to cancel appointment');
    }
  });

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Your Appointments</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No appointments scheduled</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="p-6 bg-card">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Dr. {appointment.provider.first_name} {appointment.provider.last_name}
                  </h2>
                  <p className="text-muted-foreground">{appointment.provider.specialty}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(appointment.date), 'MMMM dd, yyyy')} at {appointment.time}
                  </p>
                  <Badge 
                    variant={appointment.status === 'cancelled' ? 'destructive' : 'default'}
                    className="mt-2"
                  >
                    {appointment.status}
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => cancelAppointment.mutate(appointment.id)}
                  disabled={appointment.status === 'cancelled'}
                  className="w-full md:w-auto"
                >
                  Cancel Appointment
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;