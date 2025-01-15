import { useState } from "react";
import { AvailabilityManager } from "@/components/provider/AvailabilityManager";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

const ProviderCalendar = () => {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Calendar Management</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <AvailabilityManager />

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Calendar View</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => date && setDate(date)}
            className="rounded-md border"
          />
        </Card>
      </div>
    </div>
  );
};

export default ProviderCalendar;