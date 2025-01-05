import { useState } from "react";
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

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
}

export const AvailabilityManager = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newSlot, setNewSlot] = useState({
    start_time: "09:00",
    end_time: "17:00",
    day_of_week: 1,
  });

  const daysOfWeek = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
  ];

  const addTimeSlot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('provider_availability')
        .insert({
          provider_id: user.id,
          ...newSlot
        })
        .select()
        .single();

      if (error) throw error;
      
      setTimeSlots([...timeSlots, data as TimeSlot]);
      toast.success("Time slot added successfully");
    } catch (error) {
      console.error("Error adding time slot:", error);
      toast.error("Failed to add time slot");
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Manage Availability</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Day of Week</Label>
            <Select 
              value={newSlot.day_of_week.toString()}
              onValueChange={(value) => setNewSlot({...newSlot, day_of_week: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Time</Label>
            <Input
              type="time"
              value={newSlot.start_time}
              onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
            />
          </div>
          <div>
            <Label>End Time</Label>
            <Input
              type="time"
              value={newSlot.end_time}
              onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
            />
          </div>
        </div>

        <Button onClick={addTimeSlot} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Time Slot
        </Button>
      </div>

      <div className="mt-6">
        {timeSlots.map((slot) => (
          <div key={slot.id} className="flex items-center justify-between p-3 bg-muted rounded-lg mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{daysOfWeek[slot.day_of_week - 1]}</span>
              <span className="text-muted-foreground">
                {slot.start_time} - {slot.end_time}
              </span>
            </div>
            <Button variant="ghost" size="sm">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};