import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, MessageSquare, Info } from "lucide-react";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/notification-service";
import { NotificationSettings } from "@/types/settings";
import { Skeleton } from "@/components/ui/skeleton";

const defaultSettings: NotificationSettings = {
  id: "",
  user_id: "",
  email_notifications: true,
  appointment_reminders: true,
  application_updates: false,
  marketing_emails: false,
  system_updates: true,
  payment_notifications: true,
  chat_notifications: true,
  push_notifications: false,
  message_alerts: true
};

const NotificationsSettingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching notification settings:', error);
          return;
        }

        if (data) {
          // Ensure all fields are present by merging with defaults
          setNotificationSettings({
            ...defaultSettings,
            ...data as NotificationSettings
          });
        } else {
          // Create default settings if none exist
          const { data: newSettings, error: createError } = await supabase
            .from('notification_settings')
            .insert({
              user_id: user.id,
              ...defaultSettings
            })
            .select('*')
            .single();

          if (createError) {
            console.error('Error creating default notification settings:', createError);
          } else if (newSettings) {
            setNotificationSettings(newSettings as NotificationSettings);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          ...notificationSettings,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving notification settings:', error);
        toast.error("Failed to save notification settings");
        return;
      }

      // Handle push notification subscription
      if (notificationSettings.push_notifications) {
        const success = await subscribeToNotifications();
        if (!success) {
          // Revert the setting if subscription failed
          setNotificationSettings(prev => ({ ...prev, push_notifications: false }));
          return;
        }
      } else if (notificationSettings.push_notifications === false) {
        await unsubscribeFromNotifications();
      }

      toast.success("Notification settings saved successfully");
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-[200px] mb-6" />
        <Skeleton className="h-[200px] w-full mb-4" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Notification Settings</h1>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <Label>Enable Push Notifications</Label>
            </div>
            <Switch 
              checked={notificationSettings.push_notifications}
              onCheckedChange={(checked) => {
                if (checked) {
                  // Show notification requesting permission
                  toast.info("You'll be asked to allow notifications");
                }
                handleChange('push_notifications', checked);
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Receive notifications even when you're not using the app. 
            This requires browser permission.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label>Email Notifications</Label>
            </div>
            <Switch 
              checked={notificationSettings.email_notifications}
              onCheckedChange={(checked) => handleChange('email_notifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Appointment Reminders</Label>
            </div>
            <Switch 
              checked={notificationSettings.appointment_reminders}
              onCheckedChange={(checked) => handleChange('appointment_reminders', checked)}
              disabled={!notificationSettings.email_notifications}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label>Chat Messages</Label>
            </div>
            <Switch 
              checked={notificationSettings.chat_notifications}
              onCheckedChange={(checked) => handleChange('chat_notifications', checked)}
              disabled={!notificationSettings.email_notifications}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <Label>System Updates</Label>
            </div>
            <Switch 
              checked={notificationSettings.system_updates}
              onCheckedChange={(checked) => handleChange('system_updates', checked)}
              disabled={!notificationSettings.email_notifications}
            />
          </div>
        </div>
      </Card>

      <Button 
        onClick={saveSettings} 
        className="w-full md:w-auto"
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
};

export default NotificationsSettingsPage;
