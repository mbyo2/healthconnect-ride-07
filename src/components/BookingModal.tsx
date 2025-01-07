import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/utils/email";
import { Provider } from "@/types/provider";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
  selectedDate?: string;
  selectedTime?: string;
}

export const BookingModal = ({ 
  isOpen, 
  onClose, 
  provider, 
  selectedDate = new Date().toISOString().split('T')[0],
  selectedTime = "09:00"
}: BookingModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleBookAppointment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          provider_id: provider.id,
          date: selectedDate,
          time: selectedTime,
          status: 'scheduled',
          type: 'general',
        });

      if (error) throw error;

      await sendEmail({
        type: "appointment_reminder",
        to: [user.email!],
        data: {
          date: selectedDate,
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
        <ModalHeader>Book Appointment</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to book an appointment with Dr. {provider.first_name} {provider.last_name} on {selectedDate} at {selectedTime}?</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleBookAppointment} disabled={loading}>
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};