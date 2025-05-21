
import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, MessageCircle, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/types/notification';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        
        // Example of fetching notifications from Supabase
        // In reality, you'd need to create this table
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Ensure the data conforms to the Notification type
        if (data) {
          const typedNotifications = data.map(item => ({
            id: item.id,
            user_id: item.user_id,
            title: item.title,
            message: item.message,
            type: (item.type === 'appointment' || item.type === 'message' || item.type === 'system') 
              ? item.type 
              : 'system', // Default to 'system' if type is invalid
            read: item.read,
            created_at: item.created_at
          })) as Notification[];
          
          setNotifications(typedNotifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: "Failed to load notifications",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );

      toast({
        title: "Notification marked as read",
        description: "This notification has been marked as read."
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Failed to update notification",
        variant: "destructive"
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(notification => notification.id !== id));
      
      toast({
        title: "Notification deleted",
        description: "The notification has been removed."
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  const handleAction = (notification: Notification) => {
    if (notification.type === 'appointment') {
      navigate(`/appointments/${notification.id}`);
    } else if (notification.type === 'message') {
      navigate('/chat');
    }
    
    toast({
        title: "Taking you to the related content",
        description: `Following link from ${notification.title}`
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your appointments and messages
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (!user?.id) return;
              const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id);
                
              if (error) throw error;
              
              setNotifications(prev => 
                prev.map(notification => ({ ...notification, read: true }))
              );
              
              toast({
                title: "All notifications marked as read",
                description: "All your notifications have been marked as read."
              });
            } catch (error) {
              console.error('Error marking all as read:', error);
              toast({
                title: "Failed to update notifications",
                variant: "destructive"
              });
            }
          }}
        >
          Mark all as read
        </Button>
      </header>

      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </Card>
          ))
        ) : notifications.length === 0 ? (
          <Card className="p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground">You don't have any notifications at the moment.</p>
          </Card>
        ) : (
          notifications.map(notification => (
            <Card 
              key={notification.id} 
              className={`p-4 transition-all ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
            >
              <div className="flex gap-4">
                <div className="bg-muted rounded-full p-2">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-medium ${!notification.read ? 'text-primary' : ''}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAction(notification)}
                    >
                      View
                    </Button>
                    {!notification.read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
