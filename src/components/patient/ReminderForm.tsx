
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Trash2, Plus, Bell } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  getMedicationReminders, 
  setMedicationReminder, 
  updateMedicationReminder, 
  deleteMedicationReminder,
  formatReminderDisplay,
  startReminderChecks
} from "@/utils/reminder-service";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export const ReminderForm = () => {
  const queryClient = useQueryClient();
  const [notificationsPermission, setNotificationsPermission] = useState(
    Notification.permission || "default"
  );
  
  const [newReminder, setNewReminder] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    reminder_time: ["09:00"],
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    active: true
  });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["medication-reminders"],
    queryFn: getMedicationReminders
  });

  const createReminderMutation = useMutation({
    mutationFn: setMedicationReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      // Reset form
      setNewReminder({
        medication_name: "",
        dosage: "",
        frequency: "",
        reminder_time: ["09:00"],
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        active: true
      });
    }
  });

  const updateReminderMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      updateMedicationReminder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: deleteMedicationReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
    }
  });

  // Start checking for reminders
  useEffect(() => {
    const intervalId = startReminderChecks();
    return () => clearInterval(intervalId);
  }, []);

  const addReminderTime = () => {
    if (newReminder.reminder_time.length < 5) {
      setNewReminder({
        ...newReminder,
        reminder_time: [...newReminder.reminder_time, "12:00"]
      });
    } else {
      toast.warning("You can add a maximum of 5 reminder times");
    }
  };

  const removeReminderTime = (index: number) => {
    setNewReminder({
      ...newReminder,
      reminder_time: newReminder.reminder_time.filter((_, i) => i !== index)
    });
  };

  const updateReminderTime = (index: number, time: string) => {
    const updatedTimes = [...newReminder.reminder_time];
    updatedTimes[index] = time;
    setNewReminder({
      ...newReminder,
      reminder_time: updatedTimes
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReminder.medication_name) {
      toast.error("Please enter a medication name");
      return;
    }
    
    if (notificationsPermission !== "granted") {
      Notification.requestPermission().then(permission => {
        setNotificationsPermission(permission);
        if (permission === "granted") {
          createReminderMutation.mutate(newReminder);
        } else {
          // Create reminder anyway, but warn that browser notifications won't work
          toast.warning("Notifications permission denied. You won't receive browser notifications.");
          createReminderMutation.mutate(newReminder);
        }
      });
    } else {
      createReminderMutation.mutate(newReminder);
    }
  };

  const toggleReminderActive = (id: string, currentActive: boolean) => {
    updateReminderMutation.mutate({
      id,
      updates: { active: !currentActive }
    });
  };

  const deleteReminder = (id: string) => {
    deleteReminderMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {notificationsPermission !== "granted" && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-3 flex items-center space-x-3">
          <Bell className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-800">
              Please allow notifications to receive medication reminders.
            </p>
            <Button
              variant="link"
              className="h-auto p-0 text-amber-700"
              onClick={() => {
                Notification.requestPermission().then(permission => {
                  setNotificationsPermission(permission);
                  if (permission === "granted") {
                    toast.success("Notifications enabled!");
                  }
                });
              }}
            >
              Enable notifications
            </Button>
          </div>
        </div>
      )}

      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Add New Reminder</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="medication_name">Medication Name</Label>
            <Input
              id="medication_name"
              value={newReminder.medication_name}
              onChange={(e) =>
                setNewReminder({ ...newReminder, medication_name: e.target.value })
              }
              placeholder="Enter medication name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="dosage">Dosage</Label>
            <Input
              id="dosage"
              value={newReminder.dosage}
              onChange={(e) =>
                setNewReminder({ ...newReminder, dosage: e.target.value })
              }
              placeholder="e.g. 500mg, 1 tablet"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Input
              id="frequency"
              value={newReminder.frequency}
              onChange={(e) =>
                setNewReminder({ ...newReminder, frequency: e.target.value })
              }
              placeholder="e.g. Once daily, Twice a day"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Reminder Times</Label>
            <div className="space-y-2 mt-1">
              {newReminder.reminder_time.map((time, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <TimePicker
                    value={time}
                    onChange={(newTime) => updateReminderTime(index, newTime)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReminderTime(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addReminderTime}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mt-1 justify-start text-left font-normal"
                  >
                    {format(new Date(newReminder.start_date), "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(newReminder.start_date)}
                    onSelect={(date) =>
                      setNewReminder({
                        ...newReminder,
                        start_date: date ? format(date, "yyyy-MM-dd") : newReminder.start_date,
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mt-1 justify-start text-left font-normal"
                  >
                    {newReminder.end_date
                      ? format(new Date(newReminder.end_date), "PPP")
                      : "No end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newReminder.end_date ? new Date(newReminder.end_date) : undefined}
                    onSelect={(date) =>
                      setNewReminder({
                        ...newReminder,
                        end_date: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                    initialFocus
                    fromDate={new Date(newReminder.start_date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Create Reminder
          </Button>
        </form>
      </Card>

      <Separator className="my-6" />

      <h3 className="text-lg font-medium mb-4">Your Medication Reminders</h3>
      {isLoading ? (
        <p>Loading reminders...</p>
      ) : reminders.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">
          You haven't set any medication reminders yet.
        </p>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => {
            const { dateDisplay, timeDisplay, frequencyDisplay } = formatReminderDisplay(reminder);
            
            return (
              <Card key={reminder.id} className={cn(
                "p-4 border",
                reminder.active ? "border-primary/20" : "border-gray-200 opacity-70"
              )}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{reminder.medication_name}</h4>
                      {reminder.active ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reminder.dosage} {frequencyDisplay && `- ${frequencyDisplay}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dateDisplay} at {timeDisplay}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Switch 
                      checked={reminder.active}
                      onCheckedChange={() => toggleReminderActive(reminder.id, reminder.active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReminderForm;
