
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { Notification } from "@/types/notification";

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Efficiently fetch notifications with proper caching
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute cache before refetching
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new notifications
  });

  // Calculate unread count whenever notifications change
  useEffect(() => {
    if (notifications) {
      const unread = notifications.filter(notif => !notif.read).length;
      setUnreadCount(unread);
    }
  }, [notifications]);

  // Subscribe to realtime notification updates
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          // Invalidate the query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
      
    // Optimistic update
    queryClient.setQueryData(['notifications', user.id], (oldData: Notification[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
    });
    
    // Update unread count without waiting for refetch
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [user?.id, queryClient]);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
      
    // Optimistic update
    queryClient.setQueryData(['notifications', user.id], (oldData: Notification[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(n => ({ ...n, read: true }));
    });
    
    setUnreadCount(0);
  }, [user?.id, queryClient]);
  
  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};
