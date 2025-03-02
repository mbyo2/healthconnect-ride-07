
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { DateSelector } from "@/components/booking/DateSelector";
import { TimeSelector } from "@/components/booking/TimeSelector";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { PaymentModal } from "@/components/payment/PaymentModal";
import { Provider } from "@/types/provider";
import { useBooking } from "@/hooks/use-booking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
}

export const BookingModal = ({ isOpen, onClose, provider }: BookingModalProps) => {
  const [showPayment, setShowPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    loading,
    availableTimeSlots,
    handleBookAppointment,
  } = useBooking(provider);

  // Get user ID when component mounts
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        toast.error("You need to be logged in to book an appointment");
        onClose();
        navigate("/login");
      }
    };
    getUser();
  }, [navigate, onClose]);

  const handleConfirmBooking = async () => {
    const success = await handleBookAppointment();
    if (success) {
      setShowPayment(true);
    }
  };

  const handlePaymentComplete = () => {
    toast.success("Appointment booked successfully!");
    setShowPayment(false);
    onClose();
    navigate("/appointments");
  };

  return (
    <>
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

      {showPayment && userId && (
        <PaymentModal
          isOpen={showPayment}
          onClose={handlePaymentComplete}
          amount={provider.consultation_fee || 50}
          serviceId={provider.default_service_id}
          providerId={provider.id}
          patientId={userId}
        />
      )}
    </>
  );
};
