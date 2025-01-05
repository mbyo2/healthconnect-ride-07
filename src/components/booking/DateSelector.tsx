import { Calendar } from "@/components/ui/calendar";

interface DateSelectorProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const DateSelector = ({ date, onDateSelect }: DateSelectorProps) => {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">Select Date</label>
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateSelect}
        className="rounded-md border"
        disabled={(date) => 
          date < new Date() || 
          date.getDay() === 0 || 
          date.getDay() === 6
        }
      />
    </div>
  );
};