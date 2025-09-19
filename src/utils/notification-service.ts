import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PushSubscriptionJSON } from "@/types/settings";

// Function to request notification permission and register for push notifications
export async function subscribeToNotifications() {
  try {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      toast.error("This browser does not support push notifications");
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      toast.error("Notification permission denied");
      return false;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      toast.error("Service Worker is not supported in this browser");
      return false;
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push notifications
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("VAPID public key is not set in environment variables");
      return false;
    }
    // TODO: Use VAPID public key from environment variables and ensure backend integration for push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    // Save subscription to database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to subscribe to notifications");
      return false;
    }

    // Save subscription to database using upsert with type casting for TypeScript
    const { error } = await supabase
      .from('push_subscriptions' as any)
      .upsert({
        user_id: user.id,
        subscription: subscription as unknown as JSON,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving push subscription:', error);
      toast.error("Failed to register for push notifications");
      return false;
    }

    toast.success("Successfully subscribed to push notifications");
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    toast.error("Failed to register for push notifications");
    return false;
  }
}

// Function to unsubscribe from push notifications
export async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return true;
    }
    
    // Unsubscribe from push manager
    const unsubscribed = await subscription.unsubscribe();
    
    if (unsubscribed) {
      // Remove subscription from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions' as any)
          .delete()
          .eq('user_id', user.id);
      }
      
      toast.success("Successfully unsubscribed from push notifications");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    toast.error("Failed to unsubscribe from push notifications");
    return false;
  }
}

// Helper function to convert base64 string to Uint8Array
// This is needed for the applicationServerKey
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Function to listen for real-time notifications
export function listenForNotifications(userId: string, onNotification?: (notification: any) => void) {
  if (!userId) return { unsubscribe: () => {} };
  
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
        // Show toast notification
        toast(payload.new.title, {
          description: payload.new.message,
        });
        
        // Call onNotification callback if provided
        if (onNotification) {
          onNotification(payload.new);
        }
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          const notification = new Notification(payload.new.title, {
            body: payload.new.message,
            icon: '/favicon.ico'
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
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
}

// Function to send an email notification
export async function sendEmailNotification(
  toEmail: string, 
  type: 'appointment_reminder' | 'payment_confirmation' | 'registration_confirmation',
  data: Record<string, any>
) {
  try {
    const response = await supabase.functions.invoke('send-email', {
      body: { 
        type,
        to: [toEmail],
        data
      }
    });
    
    if (response.error) {
      console.error('Error sending email:', response.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

// TODO: Implement push notifications and reminders for user engagement
// TODO: Automate workflow status transitions and add real-time updates
// TODO: Add more environment variables for notification/push services as needed (e.g., VITE_PUSH_API_URL, VITE_NOTIFICATION_SECRET)
