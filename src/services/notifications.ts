
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Notification as NotificationType } from "@/types/notification";

export const fetchNotifications = async (userId: string): Promise<NotificationType[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
    
    return data as NotificationType[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'appointment' | 'message' | 'system' = 'system'
): Promise<NotificationType | null> => {
  try {
    const newNotification = {
      user_id: userId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(newNotification)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
    
    return data as NotificationType;
  } catch (error) {
    console.error('Error creating notification:', error);
    toast.error("Failed to create notification");
    return null;
  }
};

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

// Real-time notification listener
export const subscribeToNotifications = (userId: string, onNotification: (notification: NotificationType) => void) => {
  const channel = supabase
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const notification = payload.new as NotificationType;
        onNotification(notification);
        
        // Show toast notification
        toast(notification.title, {
          description: notification.message,
        });
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
          
          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
          };
        }
      }
    )
    .subscribe();
    
  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
};
