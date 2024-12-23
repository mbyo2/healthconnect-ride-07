import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X } from "lucide-react";

export const PrescriptionTracker = () => {
  const [medications, setMedications] = useState<any[]>([]);
  const [newMedication, setNewMedication] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    reminder_time: ["09:00"],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMedications();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('medication-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medication_reminders'
        },
        (payload) => {
          console.log('New medication reminder:', payload);
          setMedications(current => [...current, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medications",
        variant: "destructive",
      });
    }
  };

  const addMedication = async () => {
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .insert([
          {
            ...newMedication,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medication reminder added successfully",
      });

      setNewMedication({
        medication_name: "",
        dosage: "",
        frequency: "",
        reminder_time: ["09:00"],
      });
    } catch (error) {
      console.error('Error adding medication:', error);
      toast({
        title: "Error",
        description: "Failed to add medication reminder",
        variant: "destructive",
      });
    }
  };

  const addReminderTime = () => {
    setNewMedication(prev => ({
      ...prev,
      reminder_time: [...prev.reminder_time, "09:00"],
    }));
  };

  const removeReminderTime = (index: number) => {
    setNewMedication(prev => ({
      ...prev,
      reminder_time: prev.reminder_time.filter((_, i) => i !== index),
    }));
  };

  const updateReminderTime = (index: number, value: string) => {
    setNewMedication(prev => ({
      ...prev,
      reminder_time: prev.reminder_time.map((time, i) => i === index ? value : time),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Add New Medication</h3>
        <div className="space-y-4">
          <Input
            placeholder="Medication Name"
            value={newMedication.medication_name}
            onChange={(e) => setNewMedication(prev => ({ ...prev, medication_name: e.target.value }))}
          />
          <Input
            placeholder="Dosage (e.g., 10mg)"
            value={newMedication.dosage}
            onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
          />
          <Input
            placeholder="Frequency (e.g., twice daily)"
            value={newMedication.frequency}
            onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Reminder Times</label>
            {newMedication.reminder_time.map((time, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => updateReminderTime(index, e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeReminderTime(index)}
                  disabled={newMedication.reminder_time.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addReminderTime}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Time
            </Button>
          </div>
          <Button onClick={addMedication} className="w-full">
            Add Medication
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Medications</h3>
        {medications.map((med) => (
          <div key={med.id} className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium">{med.medication_name}</h4>
            <p className="text-sm text-gray-600">Dosage: {med.dosage}</p>
            <p className="text-sm text-gray-600">Frequency: {med.frequency}</p>
            <div className="mt-2">
              <p className="text-sm font-medium">Reminder Times:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {med.reminder_time.map((time: string, index: number) => (
                  <span key={index} className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};