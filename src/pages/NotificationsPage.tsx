
// Implement a notification settings page
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { NotificationSettings } from "@/types/settings";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/notification-service";

const NotificationsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingButtons, setLoadingButtons] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(true);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    const checkNotificationPermission = () => {
      if (!('Notification' in window)) {
        setPushSupported(false);
        return;
      }

      setNotificationsGranted(Notification.permission === 'granted');
    };

    checkNotificationPermission();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Authentication Error",
            description: "Please sign in to access this page",
            variant: "destructive"
          });
          return;
        }
        
        setUserId(user.id);

        // Get notification settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('notification_settings' as any)
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error("Error fetching notification settings:", settingsError);
          toast({
            title: "Error",
            description: "Failed to load notification settings",
            variant: "destructive"
          });
          return;
        }

        // If no settings exist yet, create default settings
        if (!settingsData) {
          const { data: newSettings, error: createError } = await supabase
            .from('notification_settings' as any)
            .insert({
              user_id: user.id,
              email_notifications: true,
              appointment_reminders: true,
              message_alerts: true,
              system_updates: false,
              push_notifications: false
            })
            .select('*')
            .single();

          if (createError) {
            console.error("Error creating notification settings:", createError);
            toast({
              title: "Error",
              description: "Failed to create notification settings",
              variant: "destructive"
            });
            return;
          }

          setNotificationSettings(newSettings as NotificationSettings);
        } else {
          setNotificationSettings(settingsData as NotificationSettings);
        }

        // Get recent notifications
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notificationError) {
          console.error("Error fetching notifications:", notificationError);
        } else {
          setRecentNotifications(notificationData || []);
        }

      } catch (error) {
        console.error("Error initializing notification page:", error);
        toast({
          title: "Error",
          description: "Failed to load notification settings",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  const handleToggleChange = async (setting: keyof NotificationSettings, value: boolean) => {
    if (!notificationSettings || !userId) return;

    const updatedSettings = {
      ...notificationSettings,
      [setting]: value
    };

    try {
      const { error } = await supabase
        .from('notification_settings' as any)
        .update({ [setting]: value })
        .eq('user_id', userId);

      if (error) {
        console.error(`Error updating ${setting}:`, error);
        toast({
          title: "Error",
          description: `Failed to update ${setting.replace(/_/g, ' ')}`,
          variant: "destructive"
        });
        return;
      }

      // Special case for push notifications which require browser permission
      if (setting === 'push_notifications' && value === true) {
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          setNotificationsGranted(permission === 'granted');
          
          if (permission !== 'granted') {
            toast({
              title: "Permission denied",
              description: "You need to allow notifications in your browser",
              variant: "destructive"
            });
            
            // Update the setting back to false since permission was denied
            await supabase
              .from('notification_settings' as any)
              .update({ push_notifications: false })
              .eq('user_id', userId);
              
            updatedSettings.push_notifications = false;
          } else {
            // Subscribe to push notifications
            await handleEnablePushNotifications();
          }
        } else {
          // Permission already granted, subscribe to push notifications
          await handleEnablePushNotifications();
        }
      }

      // If turning off push notifications, unsubscribe
      if (setting === 'push_notifications' && value === false) {
        await handleDisablePushNotifications();
      }

      setNotificationSettings(updatedSettings as NotificationSettings);
      toast({
        title: "Settings updated",
        description: `${setting.replace(/_/g, ' ')} has been ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
    }
  };

  const handleEnablePushNotifications = async () => {
    setLoadingButtons(true);
    try {
      const success = await subscribeToNotifications();
      
      if (!success) {
        // If subscription failed, update the UI setting back to false
        if (notificationSettings && userId) {
          const updatedSettings = {
            ...notificationSettings,
            push_notifications: false
          };
          
          await supabase
            .from('notification_settings' as any)
            .update({ push_notifications: false })
            .eq('user_id', userId);
            
          setNotificationSettings(updatedSettings as NotificationSettings);
        }
      }
    } finally {
      setLoadingButtons(false);
    }
  };

  const handleDisablePushNotifications = async () => {
    setLoadingButtons(true);
    try {
      await unsubscribeFromNotifications();
    } finally {
      setLoadingButtons(false);
    }
  };

  const handleTestNotification = async () => {
    if (!userId || !notificationSettings?.push_notifications) return;

    try {
      // Insert a test notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: "Test Notification",
          message: "This is a test notification from your settings page.",
          type: "test",
          read: false
        });

      if (error) {
        console.error("Error sending test notification:", error);
        toast({
          title: "Error",
          description: "Failed to send test notification",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in test notification:", error);
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Notification Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications" className="font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={notificationSettings?.email_notifications || false}
                onCheckedChange={(checked) => handleToggleChange('email_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="appointmentReminders" className="font-medium">
                  Appointment Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get reminders about upcoming appointments
                </p>
              </div>
              <Switch
                id="appointmentReminders"
                checked={notificationSettings?.appointment_reminders || false}
                onCheckedChange={(checked) => handleToggleChange('appointment_reminders', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="messageAlerts" className="font-medium">
                  Message Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive new messages
                </p>
              </div>
              <Switch
                id="messageAlerts"
                checked={notificationSettings?.message_alerts || false}
                onCheckedChange={(checked) => handleToggleChange('message_alerts', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="systemUpdates" className="font-medium">
                  System Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about system updates and new features
                </p>
              </div>
              <Switch
                id="systemUpdates"
                checked={notificationSettings?.system_updates || false}
                onCheckedChange={(checked) => handleToggleChange('system_updates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushNotifications" className="font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in your browser
                </p>
                {!pushSupported && (
                  <p className="text-sm text-destructive mt-1">
                    Your browser doesn't support push notifications
                  </p>
                )}
              </div>
              <Switch
                id="pushNotifications"
                checked={notificationSettings?.push_notifications || false}
                onCheckedChange={(checked) => handleToggleChange('push_notifications', checked)}
                disabled={!pushSupported || loadingButtons}
              />
            </div>
          </div>

          {notificationSettings?.push_notifications && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={handleTestNotification}
                disabled={!notificationsGranted}
              >
                Send Test Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            Your most recent notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              You don't have any notifications yet.
            </p>
          ) : (
            <div className="space-y-4">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="bg-accent/50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{notification.title}</h3>
                    <StatusBadge 
                      status={notification.read ? "completed" as StatusType : "pending" as StatusType} 
                      itemId={notification.id} 
                      tableName="appointments"
                      showRealTimeUpdates={false}
                      className="ml-2 text-xs"
                    >
                      {notification.read ? "Read" : "Unread"}
                    </StatusBadge>
                  </div>
                  <p className="text-sm mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default () => (
  <ProtectedRoute>
    <NotificationsPage />
  </ProtectedRoute>
);
