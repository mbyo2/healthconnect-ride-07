import { useState, useEffect } from "react";
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
import { Clock, Plus, Trash2, Pencil, X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
}

export const AvailabilityManager = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({
    start_time: "09:00",
    end_time: "17:00",
    day_of_week: 1,
  });

  const daysOfWeek = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', user.id)
        .order('day_of_week');

      if (error) throw error;
      setTimeSlots(data);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      toast.error("Failed to load availability schedule");
    } finally {
      setLoading(false);
    }
  };

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

  const deleteTimeSlot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('provider_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTimeSlots(timeSlots.filter(slot => slot.id !== id));
      toast.success("Time slot removed successfully");
    } catch (error) {
      console.error("Error deleting time slot:", error);
      toast.error("Failed to remove time slot");
    }
  };

  const startEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setNewSlot({
      start_time: slot.start_time,
      end_time: slot.end_time,
      day_of_week: slot.day_of_week,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewSlot({ start_time: "09:00", end_time: "17:00", day_of_week: 1 });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const { data, error } = await supabase
        .from('provider_availability')
        .update({
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          day_of_week: newSlot.day_of_week,
        })
        .eq('id', editingId)
        .select()
        .single();

      if (error) throw error;

      setTimeSlots(timeSlots.map(s => s.id === editingId ? (data as TimeSlot) : s));
      toast.success("Time slot updated successfully");
      cancelEdit();
    } catch (error) {
      console.error("Error updating time slot:", error);
      toast.error("Failed to update time slot");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-4">
        {editingId ? "Edit Time Slot" : "Manage Availability"}
      </h2>
      
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
                  <SelectItem key={index} value={index.toString()}>
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

        <div className="flex gap-2">
          {editingId ? (
            <>
              <Button onClick={saveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button onClick={cancelEdit} variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={addTimeSlot} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold mb-3">Current Availability ({timeSlots.length})</h3>
        {timeSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            No time slots yet. Add your working hours above.
          </p>
        ) : (
          timeSlots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-3 bg-muted rounded-lg mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{daysOfWeek[slot.day_of_week]}</span>
                <span className="text-muted-foreground">
                  {slot.start_time} - {slot.end_time}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(slot)}
                  aria-label={`Edit ${daysOfWeek[slot.day_of_week]} slot`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTimeSlot(slot.id)}
                  aria-label={`Delete ${daysOfWeek[slot.day_of_week]} slot`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};