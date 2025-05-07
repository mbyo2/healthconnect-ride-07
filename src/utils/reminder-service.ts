
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isTomorrow, addDays } from "date-fns";

interface MedicationReminder {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  reminder_time: string[];
  start_date: string;
  end_date?: string;
  active: boolean;
}

export async function setMedicationReminder(reminderData: Omit<MedicationReminder, 'id' | 'user_id'>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You need to be logged in to set reminders");
      return null;
    }

    const { data, error } = await supabase
      .from('medication_reminders')
      .insert({
        ...reminderData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting reminder:', error);
      toast.error("Failed to set medication reminder");
      return null;
    }

    // Schedule local notification for the reminder
    await scheduleLocalNotification(data);
    
    toast.success("Medication reminder set successfully");
    return data;
  } catch (error) {
    console.error('Error in setMedicationReminder:', error);
    toast.error("An error occurred while setting the reminder");
    return null;
  }
}

export async function getMedicationReminders() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('medication_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }

    return data as MedicationReminder[];
  } catch (error) {
    console.error('Error in getMedicationReminders:', error);
    return [];
  }
}

export async function updateMedicationReminder(id: string, updates: Partial<MedicationReminder>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You need to be logged in to update reminders");
      return false;
    }

    const { data, error } = await supabase
      .from('medication_reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      toast.error("Failed to update medication reminder");
      return false;
    }

    // Update the scheduled notification
    if (updates.active !== false) {
      await scheduleLocalNotification(data);
    }
    
    toast.success("Medication reminder updated successfully");
    return true;
  } catch (error) {
    console.error('Error in updateMedicationReminder:', error);
    toast.error("An error occurred while updating the reminder");
    return false;
  }
}

export async function deleteMedicationReminder(id: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You need to be logged in to delete reminders");
      return false;
    }

    const { error } = await supabase
      .from('medication_reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting reminder:', error);
      toast.error("Failed to delete medication reminder");
      return false;
    }
    
    toast.success("Medication reminder deleted successfully");
    return true;
  } catch (error) {
    console.error('Error in deleteMedicationReminder:', error);
    toast.error("An error occurred while deleting the reminder");
    return false;
  }
}

// Schedule a local notification for a reminder using the Notifications API
async function scheduleLocalNotification(reminder: MedicationReminder) {
  // Check if we have permission to send notifications
  if (!('Notification' in window)) {
    return;
  }
  
  if (Notification.permission !== 'granted') {
    return;
  }
  
  // For demonstration purposes, let's schedule a notification for today if within the date range
  const startDate = new Date(reminder.start_date);
  const endDate = reminder.end_date ? new Date(reminder.end_date) : null;
  const now = new Date();
  
  if ((startDate <= now) && (!endDate || endDate >= now)) {
    // Format notification time message
    let timeMessage = "today";
    
    // Create text about the next dose time
    if (reminder.reminder_time && reminder.reminder_time.length > 0) {
      timeMessage = `at ${reminder.reminder_time.join(', ')}`;
    }
    
    // Create text about frequency
    const frequencyText = reminder.frequency ? ` (${reminder.frequency})` : '';
    
    // Schedule a notification for a few seconds from now (for demo purposes)
    setTimeout(() => {
      new Notification(`Time for your medication: ${reminder.medication_name}`, {
        body: `Remember to take your ${reminder.dosage} dose ${timeMessage}${frequencyText}`,
        icon: '/favicon.ico'
      });
    }, 5000); // Show after 5 seconds for demo
  }
}

// Function to check for upcoming reminders and send notifications
export async function checkAndSendReminders() {
  try {
    const reminders = await getMedicationReminders();
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    for (const reminder of reminders) {
      // Skip inactive reminders
      if (!reminder.active) continue;
      
      // Check if reminder is within valid date range
      const startDate = new Date(reminder.start_date);
      const endDate = reminder.end_date ? new Date(reminder.end_date) : null;
      
      if (startDate > now || (endDate && endDate < now)) {
        continue;
      }
      
      // Check if any reminder time is close to current time
      for (const timeStr of reminder.reminder_time) {
        const [hourStr, minuteStr] = timeStr.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        
        // If within 5 minutes of the reminder time
        if (hour === currentHour && Math.abs(minute - currentMinute) <= 5) {
          // Show a browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(`Time for ${reminder.medication_name}`, {
              body: `It's time to take your ${reminder.dosage} dose.`,
              icon: '/favicon.ico'
            });
          }
          
          // Also show a toast notification
          toast.info(`Time for ${reminder.medication_name}`, {
            description: `It's time to take your ${reminder.dosage} dose.`
          });
          
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendReminders:', error);
  }
}

// Start periodic checks for reminders
export function startReminderChecks() {
  // Check immediately
  checkAndSendReminders();
  
  // Then check every minute
  return setInterval(checkAndSendReminders, 60000);
}

// Format a reminder for display
export function formatReminderDisplay(reminder: MedicationReminder) {
  const startDate = new Date(reminder.start_date);
  const endDate = reminder.end_date ? new Date(reminder.end_date) : null;
  
  let dateDisplay = format(startDate, 'MMM d, yyyy');
  
  if (isToday(startDate)) {
    dateDisplay = 'Today';
  } else if (isTomorrow(startDate)) {
    dateDisplay = 'Tomorrow';
  }
  
  if (endDate) {
    let endDateDisplay = format(endDate, 'MMM d, yyyy');
    
    if (isToday(endDate)) {
      endDateDisplay = 'Today';
    } else if (isTomorrow(endDate)) {
      endDateDisplay = 'Tomorrow';
    } else if (isTomorrow(addDays(endDate, -1))) {
      endDateDisplay = 'Day after tomorrow';
    }
    
    dateDisplay += ` to ${endDateDisplay}`;
  }
  
  return {
    dateDisplay,
    timeDisplay: reminder.reminder_time.join(', '),
    frequencyDisplay: reminder.frequency || 'Not specified'
  };
}
