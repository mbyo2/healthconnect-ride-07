import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const ReminderForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    reminder_time: ["09:00"],
    start_date: new Date().toISOString().split('T')[0],
  });

  const addReminderTime = () => {
    setFormData(prev => ({
      ...prev,
      reminder_time: [...prev.reminder_time, "09:00"],
    }));
  };

  const removeReminderTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reminder_time: prev.reminder_time.filter((_, i) => i !== index),
    }));
  };

  const updateReminderTime = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      reminder_time: prev.reminder_time.map((time, i) => i === index ? value : time),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('medication_reminders')
        .insert({
          ...formData,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success("Reminder set successfully!");
      setFormData({
        medication_name: "",
        dosage: "",
        frequency: "",
        reminder_time: ["09:00"],
        start_date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="medication_name">Medication Name</Label>
        <Input
          id="medication_name"
          value={formData.medication_name}
          onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="dosage">Dosage</Label>
        <Input
          id="dosage"
          value={formData.dosage}
          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="frequency">Frequency</Label>
        <Input
          id="frequency"
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="start_date">Start Date</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Reminder Times</Label>
        {formData.reminder_time.map((time, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type="time"
              value={time}
              onChange={(e) => updateReminderTime(index, e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeReminderTime(index)}
              disabled={formData.reminder_time.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addReminderTime}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Time
        </Button>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Set Reminder"}
      </Button>
    </form>
  );
};