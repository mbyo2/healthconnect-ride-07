import { useMemo } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";

interface DayStripPickerProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  daysToShow?: number;
}

/**
 * Reference-style horizontal day strip: "Today 8, Sun 9, Mon 10..."
 * Selected day highlighted in Doc'O Clock blue.
 */
export const DayStripPicker = ({ selectedDate, onSelect, daysToShow = 14 }: DayStripPickerProps) => {
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: daysToShow }, (_, i) => addDays(today, i));
  }, [daysToShow]);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 px-1">
        Please select the day and time before go for consultation day
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={`flex flex-col items-center justify-center min-w-[52px] h-[68px] rounded-2xl transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={`text-[10px] font-medium ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                {isToday ? "Today" : format(day, "EEE")}
              </span>
              <span className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
