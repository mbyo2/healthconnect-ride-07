
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/notification-service";
import { StatusBadge } from "@/components/ui/status-badge";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    messageAlerts: true,
    systemUpdates: false,
    pushNotifications: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch user's notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return data;
    },
  });
  
  // Fetch user's applications for displaying status with real-time updates
  const { data: applications = [] } = useQuery({
    queryKey: ['user-applications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('health_personnel_applications')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching applications:', error);
        return [];
      }

      return data;
    },
  });

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use the 'as any' to bypass type checking for the table name
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
          // Cast the data to our defined type
          const typedData = data as unknown as NotificationSettings;
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

  // Subscribe to real-time notifications
  useEffect(() => {
    const subscribeToRealtimeNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Invalidate the notifications query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            
            // If there's an application status change, refresh the applications
            queryClient.invalidateQueries({ queryKey: ['user-applications'] });
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    const unsubscribe = subscribeToRealtimeNotifications();
    
    return () => {
      unsubscribe.then(unsub => unsub && unsub());
    };
  }, [queryClient]);

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      // Type assertion for the table name and data
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
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving notification settings:', error);
        toast.error("Failed to save notification settings");
        return;
      }

      if (settings.pushNotifications) {
        await subscribeToNotifications();
      } else {
        await unsubscribeFromNotifications();
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

      <Card className="p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Notifications</h2>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground">You have no recent notifications.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className={`p-4 rounded-lg ${!notification.read ? 'bg-muted' : 'bg-card'} border`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">{notification.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{notification.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {applications.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-xl font-semibold mb-4">Application Status</h2>
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="p-4 rounded-lg border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Healthcare Application</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Submitted: {new Date(application.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge 
                    status={application.status} 
                    itemId={application.id} 
                    tableName="health_personnel_applications"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
