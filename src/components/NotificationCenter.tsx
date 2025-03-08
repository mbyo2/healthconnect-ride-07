
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@/types/notification';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications = [], isLoading } = useQuery({
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

      return data as Notification[];
    },
  });

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    // Get all unread notification IDs
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);
      
    if (unreadIds.length === 0) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
      
    if (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  // Subscribe to real-time updates for notifications
  useEffect(() => {
    const subscribeToNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const channel = supabase
        .channel('notification-center')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Show a toast notification
            toast(payload.new.title, {
              description: payload.new.message,
            });
            
            // Invalidate the query to refresh the notifications list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Invalidate the query to refresh the notifications list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    const unsubscribe = subscribeToNotifications();
    return () => {
      unsubscribe.then(unsub => unsub && unsub());
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" className="relative animate-pulse">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-in fade-in">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex justify-between items-center p-2 border-b">
          <div className="font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer ${!notification.read ? 'bg-muted' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="space-y-1">
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-muted-foreground">{notification.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <div className="p-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-sm"
                onClick={() => navigate("/notifications")}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
