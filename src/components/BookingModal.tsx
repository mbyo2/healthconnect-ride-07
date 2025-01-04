import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

  // Fetch existing appointments to check availability
  const { data: existingAppointments } = useQuery({
    queryKey: ['appointments', provider.id, date?.toISOString()],
    queryFn: async () => {
      if (!date) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('date', date.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data;
    },
    enabled: !!date && !!provider.id,
  });

  // Create appointment mutation
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

  // Filter out already booked time slots
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
          <div className="grid gap-2">
            <label className="text-sm font-medium">Select Date</label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              disabled={(date) => 
                date < new Date() || 
                date.getDay() === 0 || 
                date.getDay() === 6
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Select Time</label>
            <Select onValueChange={setTimeSlot} value={timeSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {availableTimeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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