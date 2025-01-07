import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppointmentWithProvider } from "@/types/appointments";

export const AppointmentsPage = () => {
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
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Your Appointments</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : appointments?.map((appointment) => (
        <Card key={appointment.id} className="mb-4 p-4">
          <h2 className="text-lg font-semibold">
            Dr. {appointment.provider.first_name} {appointment.provider.last_name}
          </h2>
          <p>{appointment.type} on {format(new Date(appointment.date), 'MMMM dd, yyyy')} at {appointment.time}</p>
          <Button
            variant="destructive"
            onClick={() => cancelAppointment.mutate(appointment.id)}
            disabled={appointment.status === 'cancelled'}
          >
            Cancel Appointment
          </Button>
        </Card>
      ))}
    </div>
  );
};

export default AppointmentsPage;