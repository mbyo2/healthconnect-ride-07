import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Appointment {
  id: string;
  date: string;
  time: string;
  patient: {
    first_name: string;
    last_name: string;
  };
  status: 'scheduled' | 'completed' | 'cancelled';
  type: string;
}

export const ScheduleManager = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles(first_name, last_name)
        `)
        .eq('provider_id', user.id)
        .eq('date', selectedDate?.toISOString().split('T')[0])
        .order('time');

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!selectedDate,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Calendar</h2>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Appointments for {selectedDate?.toLocaleDateString()}
        </h2>
        
        {isLoading ? (
          <div className="text-center py-4">Loading appointments...</div>
        ) : appointments && appointments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{appointment.time}</TableCell>
                  <TableCell>
                    {appointment.patient.first_name} {appointment.patient.last_name}
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No appointments scheduled for this day
          </div>
        )}
      </Card>
    </div>
  );
};