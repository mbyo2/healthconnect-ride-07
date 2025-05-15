
import { useState, useCallback, useEffect } from "react";
import { Notification } from "@/types/notification";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithRetry } from "@/lib/utils";

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch notifications with React Query
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        return data as Notification[];
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
  });
  
  // Calculate unread count whenever notifications change
  useEffect(() => {
    if (notifications) {
      const count = notifications.filter(n => !n.read).length;
      setUnreadCount(count);
    }
  }, [notifications]);
  
  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state to reflect the change
      refetch();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  }, [refetch]);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      // Update local state to reflect the change
      refetch();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast.error("Failed to update notifications");
    }
  }, [refetch]);
  
  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch
  };
}
