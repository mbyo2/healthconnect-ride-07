import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeSelectorProps {
  availableTimeSlots: string[];
  selectedTime: string;
  onTimeSelect: (time: string) => void;
}

export const TimeSelector = ({ availableTimeSlots, selectedTime, onTimeSelect }: TimeSelectorProps) => {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">Select Time</label>
      <Select onValueChange={onTimeSelect} value={selectedTime}>
        <SelectTrigger>
          <SelectValue placeholder="Select a time slot" />
        </SelectTrigger>
        <SelectContent>
          {availableTimeSlots.length > 0 ? (
            availableTimeSlots.map((slot) => (
              <SelectItem key={slot} value={slot}>
                {slot}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="none" disabled>
              No available slots
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};