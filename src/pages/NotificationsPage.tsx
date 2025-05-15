
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notification';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getNotificationIcon } from '@/utils/notification-utils';
import { cn } from '@/lib/utils';
import { performanceTracker } from '@/utils/performance-optimizations';

const NotificationsPage = () => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  
  // Performance tracking
  useEffect(() => {
    const stopTracking = performanceTracker.trackMetric('notifications_page_render', performance.now());
    return () => {
      if (typeof stopTracking === 'function') stopTracking();
    };
  }, []);
  
  // Fetch notifications with React Query
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        return data as Notification[];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mark notification as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (error) throw error;
      return id;
    },
    onMutate: (id) => {
      // Optimistic update
      queryClient.setQueryData(['notifications'], (old: Notification[] | undefined) => {
        if (!old) return [];
        return old.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        );
      });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    },
  });
  
  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      // Get the user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    },
  });
  
  // Filter notifications based on selected tab
  const filteredNotifications = notifications?.filter(notification => 
    selectedTab === 'all' || (selectedTab === 'unread' && !notification.read)
  );
  
  // Count unread notifications
  const unreadCount = notifications?.filter(notification => !notification.read).length || 0;
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600">Notifications</h1>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedTab === 'all' ? "default" : "outline"}
          onClick={() => setSelectedTab('all')}
          className={selectedTab === 'all' ? "bg-blue-600 hover:bg-blue-700" : "text-blue-600 hover:bg-blue-50"}
        >
          All
        </Button>
        <Button
          variant={selectedTab === 'unread' ? "default" : "outline"}
          onClick={() => setSelectedTab('unread')}
          className={selectedTab === 'unread' ? "bg-blue-600 hover:bg-blue-700" : "text-blue-600 hover:bg-blue-50"}
        >
          Unread {unreadCount > 0 && <Badge className="ml-1 bg-blue-800">{unreadCount}</Badge>}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">No {selectedTab === 'unread' ? 'unread ' : ''}notifications</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const NotificationIcon = getNotificationIcon(notification.type);
            return (
              <Card 
                key={notification.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow",
                  !notification.read ? "border-l-4 border-l-blue-600" : ""
                )}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead.mutate(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-full shrink-0",
                    !notification.read ? "bg-blue-100" : "bg-gray-100"
                  )}>
                    <NotificationIcon className={cn(
                      "h-5 w-5",
                      !notification.read ? "text-blue-600" : "text-gray-500"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-700">{notification.title}</div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {!notification.read && (
                    <Badge className="bg-blue-600">New</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
