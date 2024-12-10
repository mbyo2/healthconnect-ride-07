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

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: {
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

  const handleBooking = () => {
    if (!date || !timeSlot) return;
    
    // Here you would typically make an API call to book the appointment
    console.log("Booking appointment with", provider.name, "for", date, "at", timeSlot);
    
    toast.success("Appointment booked successfully!", {
      description: `Your appointment with ${provider.name} is scheduled for ${date.toLocaleDateString()} at ${timeSlot}`,
    });
    
    onClose();
  };

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
              disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Select Time</label>
            <Select onValueChange={setTimeSlot} value={timeSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
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
          <Button onClick={handleBooking} disabled={!date || !timeSlot}>
            Book Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};