import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, CheckCheck, Trash2, Calendar, MessageSquare, AlertCircle, FileText, Pill, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'appointment' | 'message' | 'system' | 'reminder' | 'alert' | 'connection';
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: any;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data as any || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications' as any).delete().eq('id', id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'reminder':
        return <Pill className="h-5 w-5 text-purple-500" />;
      case 'connection':
        return <Users className="h-5 w-5 text-indigo-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">
            All {notifications.length > 0 && `(${notifications.length})`}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-4 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-accent/50 transition-colors ${!notification.read ? 'bg-accent/20' : ''
                          }`}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-sm">
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                              {!notification.read && (
                                <Badge variant="default" className="flex-shrink-0">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2 mt-3">
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Mark Read
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
