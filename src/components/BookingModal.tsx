import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { DateSelector } from "@/components/booking/DateSelector";
import { TimeSelector } from "@/components/booking/TimeSelector";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { Provider } from "@/types/provider";
import { useBooking } from "@/hooks/use-booking";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
}

export const BookingModal = ({ isOpen, onClose, provider }: BookingModalProps) => {
  const {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    loading,
    availableTimeSlots,
    handleBookAppointment,
  } = useBooking(provider);

  const handleConfirmBooking = async () => {
    const success = await handleBookAppointment();
    if (success) {
      onClose();
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
            providerId={provider.id}
          />
          {selectedDate && (
            <TimeSelector
              availableTimeSlots={availableTimeSlots}
              selectedTime={selectedTime || ""}
              onTimeSelect={setSelectedTime}
            />
          )}
          <BookingSummary 
            provider={provider}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleConfirmBooking} 
            disabled={loading || !selectedDate || !selectedTime}
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};