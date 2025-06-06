
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" className="relative animate-pulse">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'appointment') {
      navigate('/appointments');
    } else if (notification.type === 'message') {
      navigate('/chat');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-in fade-in">
              {unreadCount > 99 ? '99+' : unreadCount}
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
            No notifications yet
          </div>
        ) : (
          <>
            {notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer ${!notification.read ? 'bg-muted' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="space-y-1">
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()} at{' '}
                    {new Date(notification.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
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
                View all notifications ({notifications.length})
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
