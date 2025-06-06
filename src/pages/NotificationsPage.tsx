
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Calendar, MessageCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/use-notifications';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const handleNotificationAction = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'appointment') {
      navigate('/appointments');
    } else if (notification.type === 'message') {
      navigate('/chat');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case 'system':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {notifications.length > 0 
              ? `${notifications.length} total, ${unreadCount} unread`
              : 'Stay updated with your appointments and messages'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
          >
            Mark all as read ({unreadCount})
          </Button>
        )}
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
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </Card>
          ))
        ) : notifications.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any notifications at the moment.
            </p>
            <Button onClick={() => navigate('/appointments')} variant="outline">
              Check your appointments
            </Button>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`p-4 transition-all hover:shadow-md ${
                !notification.read ? 'border-l-4 border-l-primary bg-blue-50/50' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="bg-muted rounded-full p-2 flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-medium ${
                      !notification.read ? 'text-primary font-semibold' : 'text-foreground'
                    }`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleNotificationAction(notification)}
                    >
                      {notification.type === 'appointment' ? 'View Appointment' : 
                       notification.type === 'message' ? 'View Message' : 'View Details'}
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
