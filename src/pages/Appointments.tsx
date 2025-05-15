
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentWithProvider } from "@/types/appointments";
import { useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";
import { useApiQuery } from "@/hooks/use-api-query";

const AppointmentsPage = () => {
  const queryClient = useQueryClient();

  // Efficiently fetch appointments with query key dependencies
  const { data: appointments = [], isLoading, error } = useApiQuery<AppointmentWithProvider[]>(
    ['appointments'],
    async () => {
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
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true, // Refetch when window regains focus
      errorMessage: "Failed to load appointments"
    }
  );

  // Memoized mutation function with optimistic updates
  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onMutate: async (appointmentId) => {
      // Cancel any outgoing refetches 
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      
      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(['appointments']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['appointments'], (old: AppointmentWithProvider[] | undefined) => {
        if (!old) return [];
        return old.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: 'cancelled' } 
            : appointment
        );
      });
      
      return { previousAppointments };
    },
    onSuccess: () => {
      toast.success('Appointment cancelled successfully');
    },
    onError: (error, appointmentId, context) => {
      // Revert back to previous appointments on error
      if (context?.previousAppointments) {
        queryClient.setQueryData(['appointments'], context.previousAppointments);
      }
      console.error('Error canceling appointment:', error);
      toast.error('Failed to cancel appointment');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  // Memoized cancel handler
  const handleCancel = useCallback((appointmentId: string) => {
    cancelAppointment.mutate(appointmentId);
  }, [cancelAppointment]);

  // Memoize processed appointments for rendering optimization
  const sortedAppointments = useMemo(() => {
    if (!appointments.length) return [];
    
    // Sort upcoming appointments first, then past appointments
    const now = new Date();
    return [...appointments].sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      
      // First compare if one is in the future and one is in the past
      const aIsFuture = aDate >= now;
      const bIsFuture = bDate >= now;
      
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;
      
      // Then sort by date (ascending for future dates, descending for past dates)
      return aIsFuture 
        ? aDate.getTime() - bDate.getTime() 
        : bDate.getTime() - aDate.getTime();
    });
  }, [appointments]);

  return (
    <NetworkErrorBoundary>
      <div className="container mx-auto px-4 py-6 bg-background min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-foreground text-blue-600">Your Appointments</h1>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : sortedAppointments.length === 0 ? (
          <Card className="p-6 text-center border border-blue-100 shadow-md">
            <p className="text-muted-foreground mb-4">No appointments scheduled</p>
            <Button className="mt-4 bg-blue-500 hover:bg-blue-600" asChild>
              <Link to="/search">Find Healthcare Providers</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedAppointments.map((appointment) => (
              <Card key={appointment.id} className="p-6 bg-card hover:shadow-md transition-shadow border border-blue-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-card-foreground text-blue-700">
                      Dr. {appointment.provider.first_name} {appointment.provider.last_name}
                    </h2>
                    <p className="text-muted-foreground text-blue-600/80">{appointment.provider.specialty}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(appointment.date), 'MMMM dd, yyyy')} at {appointment.time}
                    </p>
                    <Badge 
                      variant={
                        appointment.status === 'cancelled' ? 'destructive' : 
                        appointment.status === 'completed' ? 'outline' : 'default'
                      }
                      className={`mt-2 ${
                        appointment.status === 'scheduled' ? 'bg-blue-500' : ''
                      }`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      asChild
                      className="flex-1 md:flex-none border-blue-300 hover:bg-blue-50"
                    >
                      <Link to={`/appointments/${appointment.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancel(appointment.id)}
                      disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
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
    </NetworkErrorBoundary>
  );
};

export default AppointmentsPage;
