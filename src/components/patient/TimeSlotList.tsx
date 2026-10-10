import { Button } from "@/components/ui/button";
import { isExpiringSoon } from "@/utils/celebration";

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
  slotDate?: Date;
}

/**
 * Reference-style vertical time slot list.
 * Booked slots shown muted, selected highlighted in blue.
 * Expiring slots (within 2h) pulse with urgency ring + badge.
 */
export const TimeSlotList = ({ slots, selectedTime, onSelect, onContinue, slotDate }: TimeSlotListProps) => {
  const today = slotDate || new Date();
  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time;
        const isBooked = slot.booked;
        const isExpiring = !isBooked && !isSelected && isExpiringSoon(slot.time, today);
        return (
          <button
            key={slot.time}
            disabled={isBooked}
            onClick={() => onSelect(slot.time)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors doc-springy ${
              isBooked
                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                : isSelected
                ? "bg-blue-50 border-blue-600 text-gray-900"
                : isExpiring
                ? "bg-orange-50 border-orange-300 text-gray-900 doc-pulse-ring"
                : "bg-white border-gray-200 text-gray-900 hover:border-blue-300"
            }`}
          >
            <span className="font-medium text-sm flex items-center gap-2">
              {slot.label}
              {isExpiring && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full doc-urgency-blink">
                  Expiring soon
                </span>
              )}
            </span>
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
          className="w-full mt-4 rounded-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold doc-springy"
        >
          Continue
        </Button>
      )}
    </div>
  );
};
