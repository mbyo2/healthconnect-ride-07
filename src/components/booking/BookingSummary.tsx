import { format } from "date-fns";
import { Provider } from "@/types/provider";

interface BookingSummaryProps {
  provider: Provider;
  selectedDate?: Date;
  selectedTime?: string;
}

export const BookingSummary = ({ provider, selectedDate, selectedTime }: BookingSummaryProps) => {
  if (!selectedDate || !selectedTime) return null;

  return (
    <div className="p-4 bg-muted rounded-lg space-y-2">
      <h3 className="font-medium">Booking Summary</h3>
      <div className="text-sm space-y-1">
        <p>Provider: Dr. {provider.first_name} {provider.last_name}</p>
        <p>Date: {format(selectedDate, "MMMM d, yyyy")}</p>
        <p>Time: {selectedTime}</p>
        <p>Duration: 30 minutes</p>
      </div>
    </div>
  );
};