
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { NotificationSettings } from '@/types/settings';
import { subscribeToNotifications, unsubscribeFromNotifications } from '@/utils/notification-service';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/status-badge';
import { X, Bell, Settings, Info } from 'lucide-react';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    id: '',
    user_id: '',
    email_notifications: true,
    appointment_reminders: true,
    message_alerts: true,
    system_updates: false,
    push_notifications: false,
    created_at: '',
    updated_at: ''
  });
  const [activeTab, setActiveTab] = useState('notifications');
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      setPushPermissionStatus('unsupported');
    } else {
      setPushPermissionStatus(Notification.permission as NotificationPermission);
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (notificationsError) throw notificationsError;
      
      // Fetch notification settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('notification_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Create default settings if none exist
      if (settingsError && settingsError.code === 'PGRST116') {
        const defaultSettings = {
          user_id: user.id,
          email_notifications: true,
          appointment_reminders: true,
          message_alerts: true,
          system_updates: false,
          push_notifications: false
        };
        
        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings' as any)
          .insert(defaultSettings)
          .select('*')
          .single();
          
        if (createError) throw createError;
        
        setSettings(newSettings as unknown as NotificationSettings);
      } else if (settingsError) {
        throw settingsError;
      } else {
        setSettings(settingsData as unknown as NotificationSettings);
      }
      
      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Error fetching notification data:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSetting = async (setting: keyof NotificationSettings) => {
    if (!settings.id) return;
    
    try {
      const newValue = !settings[setting];
      
      // Special handling for push notifications
      if (setting === 'push_notifications') {
        if (newValue) {
          // Attempt to subscribe
          const subscribed = await subscribeToNotifications();
          if (!subscribed) return;
        } else {
          // Attempt to unsubscribe
          const unsubscribed = await unsubscribeFromNotifications();
          if (!unsubscribed) return;
        }
      }
      
      // Update in-memory state first for a responsive UI
      setSettings({ ...settings, [setting]: newValue });
      
      // Update in database
      const { error } = await supabase
        .from('notification_settings' as any)
        .update({ [setting]: newValue })
        .eq('id', settings.id);
        
      if (error) throw error;
      
      toast.success(`${setting.replace(/_/g, ' ')} ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update settings');
      // Revert the optimistic update
      fetchData();
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      ));
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.filter(notification => notification.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch(type) {
      case 'appointment_reminder':
        return "bg-blue-500 hover:bg-blue-600";
      case 'application_update':
        return "bg-purple-500 hover:bg-purple-600";
      case 'payment_confirmation':
        return "bg-green-500 hover:bg-green-600";
      case 'system_update':
        return "bg-amber-500 hover:bg-amber-600";
      default:
        return "bg-slate-500 hover:bg-slate-600";
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <TabsContent value="notifications" className="space-y-4">
        {notifications.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          </div>
        )}
        
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No notifications yet</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                New notifications will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`relative ${!notification.read ? 'border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800' : ''}`}
            >
              {!notification.read && (
                <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-blue-500"></span>
              )}
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg">{notification.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(notification.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p>{notification.message}</p>
              </CardContent>
              <CardFooter className="flex justify-between pt-1 pb-2">
                <Badge 
                  className={getNotificationBadgeColor(notification.type)}
                  variant="secondary"
                >
                  {notification.type.replace(/_/g, ' ')}
                </Badge>
                {!notification.read && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => markAsRead(notification.id)}
                  >
                    Mark as read
                  </Button>
                )}
                
                {notification.type === 'application_update' && notification.data?.applicationId && (
                  <StatusBadge 
                    status={notification.data.status as StatusType || "pending"} 
                    itemId={notification.data.applicationId} 
                    tableName="health_personnel_applications"
                  />
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </TabsContent>
      
      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Customize how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={() => handleToggleSetting('email_notifications')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="appointment_reminders">Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get reminders for your upcoming appointments</p>
                </div>
                <Switch
                  id="appointment_reminders"
                  checked={settings.appointment_reminders}
                  onCheckedChange={() => handleToggleSetting('appointment_reminders')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="message_alerts">Message Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when you receive new messages</p>
                </div>
                <Switch
                  id="message_alerts"
                  checked={settings.message_alerts}
                  onCheckedChange={() => handleToggleSetting('message_alerts')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system_updates">System Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified about system updates and new features</p>
                </div>
                <Switch
                  id="system_updates"
                  checked={settings.system_updates}
                  onCheckedChange={() => handleToggleSetting('system_updates')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications on your device when the browser is closed
                  </p>
                </div>
                <Switch
                  id="push_notifications"
                  disabled={pushPermissionStatus === 'unsupported' || pushPermissionStatus === 'denied'}
                  checked={settings.push_notifications}
                  onCheckedChange={() => handleToggleSetting('push_notifications')}
                />
              </div>
            </div>
            
            {pushPermissionStatus === 'unsupported' && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start">
                <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5 mr-2" />
                <p className="text-sm text-amber-800">
                  Push notifications are not supported on your device or browser.
                </p>
              </div>
            )}
            
            {pushPermissionStatus === 'denied' && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start">
                <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5 mr-2" />
                <div className="text-sm text-amber-800">
                  <p>Push notification permission was denied.</p>
                  <p className="mt-1">To enable, please update your browser settings to allow notifications from this site.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
};

export default NotificationsPage;
