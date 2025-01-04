import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Appointment } from "@/types/appointment";

const Appointments = () => {
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          providers:provider_id (
            first_name,
            last_name,
            specialty
          )
        `)
        .eq('patient_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
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
      toast.success("Appointment cancelled successfully");
    },
    onError: () => {
      toast.error("Failed to cancel appointment");
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14 px-4">
        <h1 className="text-2xl font-bold mb-4">Your Appointments</h1>
        <div className="space-y-4">
          {appointments && appointments.length > 0 ? (
            appointments.map((appointment: any) => (
              <Card key={appointment.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      Dr. {appointment.providers.first_name} {appointment.providers.last_name}
                    </h3>
                    <p className="text-gray-600">{appointment.providers.specialty}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(appointment.date), 'PPP')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {appointment.time}
                      </div>
                    </div>
                    <span className={`mt-2 inline-block px-2 py-1 rounded-full text-xs ${
                      appointment.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>
                  {appointment.status === 'scheduled' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => cancelAppointment.mutate(appointment.id)}
                      disabled={cancelAppointment.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Appointments;