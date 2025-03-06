
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Mail, MessageSquare, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useMediaQuery } from "@/hooks/use-media-query";
import { NotificationSettings, PushSubscription } from "@/types/settings";

const NotificationsPage = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    messageAlerts: true,
    systemUpdates: false,
    pushNotifications: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use a type assertion to tell TypeScript we know what we're getting back
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
          // We're now asserting the type of data
          const typedData = data as NotificationSettings;
          setSettings({
            emailNotifications: typedData.email_notifications,
            appointmentReminders: typedData.appointment_reminders,
            messageAlerts: typedData.message_alerts,
            systemUpdates: typedData.system_updates,
            pushNotifications: typedData.push_notifications || false,
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

      // Type assertion for the upsert operation
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          email_notifications: settings.emailNotifications,
          appointment_reminders: settings.appointmentReminders,
          message_alerts: settings.messageAlerts,
          system_updates: settings.systemUpdates,
          push_notifications: settings.pushNotifications,
          updated_at: new Date().toISOString(),
        } as NotificationSettings, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving notification settings:', error);
        toast.error("Failed to save notification settings");
        return;
      }

      if (settings.pushNotifications) {
        requestPushPermission();
      }

      toast.success("Notification settings saved successfully");
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while saving settings");
    } finally {
      setIsLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error("Push notifications are not supported by your browser");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            // This should be your VAPID public key
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
          )
        });
        
        // Save the subscription to your database
        await saveSubscription(subscription);
        toast.success("Push notifications enabled");
      } else {
        toast.error("Permission for push notifications was denied");
        setSettings(prev => ({ ...prev, pushNotifications: false }));
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast.error("Failed to enable push notifications");
      setSettings(prev => ({ ...prev, pushNotifications: false }));
    }
  };

  const saveSubscription = async (subscription) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Type assertion for the upsert operation
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription,
        created_at: new Date().toISOString(),
      } as PushSubscription, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving push subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <NotificationCenter />
      </div>

      <Card className="p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Notifications</h2>
        <div className="space-y-4">
          {/* This would be populated from the NotificationCenter component */}
          <p className="text-muted-foreground">Your recent notifications will appear here.</p>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <Label htmlFor="email-notifications" className="text-sm md:text-base">Email Notifications</Label>
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
              <Label htmlFor="appointment-reminders" className="text-sm md:text-base">Appointment Reminders</Label>
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
              <Label htmlFor="message-alerts" className="text-sm md:text-base">Message Alerts</Label>
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
              <Label htmlFor="system-updates" className="text-sm md:text-base">System Updates</Label>
            </div>
            <Switch
              id="system-updates"
              checked={settings.systemUpdates}
              onCheckedChange={(checked) => setSettings({ ...settings, systemUpdates: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <Label htmlFor="push-notifications" className="text-sm md:text-base">Push Notifications</Label>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
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
