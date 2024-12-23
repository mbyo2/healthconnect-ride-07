import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Plus, Trash2 } from "lucide-react";

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const ProviderCalendar = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAvailability, setNewAvailability] = useState({
    day_of_week: "0",
    start_time: "09:00",
    end_time: "17:00",
  });

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("provider_availability")
        .select("*")
        .order("day_of_week");

      if (error) throw error;
      setAvailabilities(data || []);
    } catch (error: any) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability schedule");
    } finally {
      setLoading(false);
    }
  };

  const addAvailability = async () => {
    try {
      const { error } = await supabase.from("provider_availability").insert([
        {
          day_of_week: parseInt(newAvailability.day_of_week),
          start_time: newAvailability.start_time,
          end_time: newAvailability.end_time,
        },
      ]);

      if (error) throw error;
      toast.success("Availability added successfully");
      fetchAvailability();
    } catch (error: any) {
      console.error("Error adding availability:", error);
      toast.error("Failed to add availability");
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from("provider_availability")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Availability removed successfully");
      fetchAvailability();
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      toast.error("Failed to remove availability");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Calendar Management</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Set Availability</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="day">Day of Week</Label>
              <Select
                value={newAvailability.day_of_week}
                onValueChange={(value) =>
                  setNewAvailability({ ...newAvailability, day_of_week: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newAvailability.start_time}
                  onChange={(e) =>
                    setNewAvailability({
                      ...newAvailability,
                      start_time: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newAvailability.end_time}
                  onChange={(e) =>
                    setNewAvailability({
                      ...newAvailability,
                      end_time: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button
              onClick={addAvailability}
              className="w-full"
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Availability
            </Button>
          </div>

          <div className="mt-6 space-y-2">
            {availabilities.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {daysOfWeek[slot.day_of_week]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAvailability(slot.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

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