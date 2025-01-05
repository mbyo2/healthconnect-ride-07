import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateSelector } from "./booking/DateSelector";
import { TimeSelector } from "./booking/TimeSelector";
import { Appointment } from "@/types/appointments";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: {
    id: string;
    name: string;
    specialty: string;
  };
}

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "02:00 PM", "03:00 PM", "04:00 PM"
];

export const BookingModal = ({ isOpen, onClose, provider }: BookingModalProps) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: existingAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', provider.id, date?.toISOString()],
    queryFn: async () => {
      if (!date) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('date', date.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!date && !!provider.id,
  });

  const createAppointment = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      if (!date || !timeSlot) throw new Error('Please select date and time');

      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            provider_id: provider.id,
            patient_id: user.id,
            date: date.toISOString().split('T')[0],
            time: timeSlot,
            status: 'scheduled',
            type: 'consultation',
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Appointment booked successfully!", {
        description: `Your appointment with ${provider.name} is scheduled for ${date?.toLocaleDateString()} at ${timeSlot}`,
      });
      onClose();
    },
    onError: (error) => {
      console.error('Booking error:', error);
      toast.error("Failed to book appointment", {
        description: "Please try again later or contact support.",
      });
    },
  });

  const handleBooking = () => {
    createAppointment.mutate();
  };

  const availableTimeSlots = timeSlots.filter(slot => {
    return !existingAppointments?.some(apt => apt.time === slot);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Schedule an appointment with {provider.name} - {provider.specialty}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <DateSelector date={date} onDateSelect={setDate} />
          <TimeSelector 
            availableTimeSlots={availableTimeSlots}
            selectedTime={timeSlot}
            onTimeSelect={setTimeSlot}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleBooking} 
            disabled={!date || !timeSlot || createAppointment.isPending}
          >
            {createAppointment.isPending ? "Booking..." : "Book Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};