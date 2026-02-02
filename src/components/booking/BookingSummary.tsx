import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { Provider } from "@/types/provider";

interface BookingSummaryProps {
  provider: Provider;
  selectedDate?: Date;
  selectedTime?: string;
  appointmentType?: string;
  providerAddress?: string;
}

export const BookingSummary = ({ 
  provider, 
  selectedDate, 
  selectedTime,
  appointmentType = 'physical',
  providerAddress
}: BookingSummaryProps) => {
  if (!selectedDate || !selectedTime) return null;

  return (
    <div className="p-4 bg-muted rounded-lg space-y-2">
      <h3 className="font-medium">Booking Summary</h3>
      <div className="text-sm space-y-1">
        <p>Provider: Dr. {provider.first_name} {provider.last_name}</p>
        <p>Date: {format(selectedDate, "MMMM d, yyyy")}</p>
        <p>Time: {selectedTime}</p>
        <p>Duration: 30 minutes</p>
        
        {/* Show location for physical appointments */}
        {appointmentType === 'physical' && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Appointment Location</p>
                {providerAddress ? (
                  <p className="text-muted-foreground">{providerAddress}</p>
                ) : (
                  <p className="text-muted-foreground">Location will be provided</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};