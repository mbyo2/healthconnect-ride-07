import { Button } from "@/components/ui/button";

interface TimeSlot {
  time: string;
  label: string;
  booked?: boolean;
}

interface TimeSlotListProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  onContinue?: () => void;
}

/**
 * Reference-style vertical time slot list.
 * Booked slots shown muted, selected highlighted in blue.
 */
export const TimeSlotList = ({ slots, selectedTime, onSelect, onContinue }: TimeSlotListProps) => {
  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time;
        const isBooked = slot.booked;
        return (
          <button
            key={slot.time}
            disabled={isBooked}
            onClick={() => onSelect(slot.time)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
              isBooked
                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                : isSelected
                ? "bg-blue-50 border-blue-600 text-gray-900"
                : "bg-white border-gray-200 text-gray-900 hover:border-blue-300"
            }`}
          >
            <span className="font-medium text-sm">{slot.label}</span>
            <span
              className={`text-xs font-semibold ${
                isBooked ? "text-gray-400" : isSelected ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {isBooked ? "Booked" : isSelected ? "Selected" : ""}
            </span>
          </button>
        );
      })}
      {onContinue && (
        <Button
          onClick={onContinue}
          disabled={!selectedTime}
          className="w-full mt-4 rounded-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
        >
          Continue
        </Button>
      )}
    </div>
  );
};
