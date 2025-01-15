import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { DateSelector } from "@/components/booking/DateSelector";
import { TimeSelector } from "@/components/booking/TimeSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/utils/email";
import { Provider } from "@/types/provider";
import { useQuery } from "@tanstack/react-query";
import { generateTimeSlots, isSlotAvailable } from "@/utils/scheduling";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
}

export const BookingModal = ({ isOpen, onClose, provider }: BookingModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Fetch provider availability
  const { data: availability } = useQuery({
    queryKey: ["providerAvailability", provider.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      
      const dayOfWeek = selectedDate.getDay();
      const { data, error } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", provider.id)
        .eq("day_of_week", dayOfWeek)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  // Fetch existing appointments
  const { data: existingAppointments } = useQuery({
    queryKey: ["appointments", provider.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("provider_id", provider.id)
        .eq("date", selectedDate.toISOString().split("T")[0]);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  const availableTimeSlots = availability
    ? generateTimeSlots(
        availability.start_time,
        availability.end_time,
        30,
        availability.break_start,
        availability.break_end
      ).filter((time) =>
        selectedDate && existingAppointments
          ? isSlotAvailable(selectedDate, time, existingAppointments)
          : true
      )
    : [];

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          provider_id: provider.id,
          date: selectedDate.toISOString().split("T")[0],
          time: selectedTime,
          status: "scheduled",
          type: "general",
          duration: 30,
        });

      if (error) throw error;

      await sendEmail({
        type: "appointment_reminder",
        to: [user.email!],
        data: {
          date: selectedDate.toISOString().split("T")[0],
          time: selectedTime,
          provider: {
            first_name: provider.first_name,
            last_name: provider.last_name,
          },
        },
      });

      toast.success("Appointment booked successfully!");
      onClose();
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>Book Appointment with Dr. {provider.first_name} {provider.last_name}</ModalHeader>
        <ModalBody className="space-y-4">
          <DateSelector
            date={selectedDate}
            onDateSelect={setSelectedDate}
          />
          {selectedDate && (
            <TimeSelector
              availableTimeSlots={availableTimeSlots}
              selectedTime={selectedTime || ""}
              onTimeSelect={setSelectedTime}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleBookAppointment} 
            disabled={loading || !selectedDate || !selectedTime}
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};