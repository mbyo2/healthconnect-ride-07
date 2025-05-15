
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Notification } from "@/types/notification";
import { v4 as uuidv4 } from "uuid";

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Notification[];
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
): Promise<Notification | null> => {
  try {
    const notificationId = uuidv4();
    const newNotification: Notification = {
      id: notificationId,
      user_id: userId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('notifications')
      .insert(newNotification);
      
    if (error) throw error;
    
    // Optionally show a toast for immediate feedback
    toast(title, {
      description: message,
    });
    
    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
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
      
    if (error) throw error;
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
      
    if (error) throw error;
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
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};
