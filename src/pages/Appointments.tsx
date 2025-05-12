
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentWithProvider } from "@/types/appointments";
import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const AppointmentsPage = () => {
  const queryClient = useQueryClient();

  // Efficiently fetch appointments with query key dependencies
  const { data: appointments = [], isLoading, error } = useQuery({
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
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Memoized mutation function
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
    onError: (error) => {
      console.error('Error canceling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  });

  // Memoized cancel handler
  const handleCancel = useCallback((appointmentId: string) => {
    cancelAppointment.mutate(appointmentId);
  }, [cancelAppointment]);

  if (error) {
    toast.error('Failed to load appointments');
    console.error('Error loading appointments:', error);
  }

  return (
    <div className="container mx-auto px-4 py-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Your Appointments</h1>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No appointments scheduled</p>
          <Button className="mt-4" asChild>
            <Link to="/search">Find Healthcare Providers</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="p-6 bg-card hover:shadow-md transition-shadow">
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
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    asChild
                    className="flex-1 md:flex-none"
                  >
                    <Link to={`/appointments/${appointment.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancel(appointment.id)}
                    disabled={appointment.status === 'cancelled'}
                    className="flex-1 md:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
