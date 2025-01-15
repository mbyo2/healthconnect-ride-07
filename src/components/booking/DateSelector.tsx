import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DateSelectorProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  providerId?: string;
}

export const DateSelector = ({ date, onDateSelect, providerId }: DateSelectorProps) => {
  const { data: availableDays } = useQuery({
    queryKey: ["providerAvailableDays", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data, error } = await supabase
        .from("provider_availability")
        .select("day_of_week")
        .eq("provider_id", providerId);

      if (error) throw error;
      return data.map(d => d.day_of_week);
    },
    enabled: !!providerId,
  });

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">Select Date</label>
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateSelect}
        className="rounded-md border"
        disabled={(date) => {
          const day = date.getDay();
          return (
            date < new Date() || 
            (availableDays && !availableDays.includes(day))
          );
        }}
      />
    </div>
  );
};