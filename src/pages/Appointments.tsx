import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppointmentTypes } from "@/integrations/supabase/types/appointments";

export const AppointmentsPage = () => {
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*, provider:profiles(*)')
        .eq('patient_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return appointments as (AppointmentTypes['Row'] & { provider: any })[];
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
      ) : (
        appointments?.map((appointment) => (
          <Card key={appointment.id} className="mb-4 p-4">
            <h2 className="text-lg font-semibold">
              {appointment.provider.first_name} {appointment.provider.last_name}
            </h2>
            <p>{appointment.type} on {format(new Date(appointment.date), 'MMMM dd, yyyy')} at {appointment.time}</p>
            <Button
              variant="destructive"
              onClick={() => cancelAppointment.mutate(appointment.id)}
            >
              Cancel Appointment
            </Button>
          </Card>
        ))
      )}
    </div>
  );
};

export default AppointmentsPage;
