
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";

const NotificationsPage = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    messageAlerts: true,
    systemUpdates: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNotificationSettings = async () => {
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
          setSettings({
            emailNotifications: data.email_notifications,
            appointmentReminders: data.appointment_reminders,
            messageAlerts: data.message_alerts,
            systemUpdates: data.system_updates,
          });
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchNotificationSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          email_notifications: settings.emailNotifications,
          appointment_reminders: settings.appointmentReminders,
          message_alerts: settings.messageAlerts,
          system_updates: settings.systemUpdates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving notification settings:', error);
        toast.error("Failed to save notification settings");
        return;
      }

      toast.success("Notification settings saved successfully");
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while saving settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <NotificationCenter />
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Notifications</h2>
        <div className="space-y-4">
          {/* This would be populated from the NotificationCenter component */}
          <p className="text-muted-foreground">Your recent notifications will appear here.</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <Label htmlFor="email-notifications">Email Notifications</Label>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <Label htmlFor="appointment-reminders">Appointment Reminders</Label>
            </div>
            <Switch
              id="appointment-reminders"
              checked={settings.appointmentReminders}
              onCheckedChange={(checked) => setSettings({ ...settings, appointmentReminders: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <Label htmlFor="message-alerts">Message Alerts</Label>
            </div>
            <Switch
              id="message-alerts"
              checked={settings.messageAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, messageAlerts: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellOff className="h-5 w-5 text-primary" />
              <Label htmlFor="system-updates">System Updates</Label>
            </div>
            <Switch
              id="system-updates"
              checked={settings.systemUpdates}
              onCheckedChange={(checked) => setSettings({ ...settings, systemUpdates: checked })}
            />
          </div>
        </div>
        <Button 
          className="mt-6 w-full md:w-auto" 
          onClick={handleSaveSettings}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </Card>
    </div>
  );
};

export default NotificationsPage;
