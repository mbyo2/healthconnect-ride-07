import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface TimeSelectorProps {
  availableTimeSlots: string[];
  selectedTime: string;
  onTimeSelect: (time: string) => void;
}

export const TimeSelector = ({ availableTimeSlots, selectedTime, onTimeSelect }: TimeSelectorProps) => {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">Select Time</label>
      {availableTimeSlots.length === 0 ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2 p-4 bg-muted rounded-lg">
          <Calendar className="w-4 h-4" />
          <span>No available slots for this date. Please select another date.</span>
        </div>
      ) : (
        <Select onValueChange={onTimeSelect} value={selectedTime}>
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
      )}
    </div>
  );
};