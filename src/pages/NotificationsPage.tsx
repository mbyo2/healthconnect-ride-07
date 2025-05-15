
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Clock, MessageSquare, Calendar, AlertTriangle } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Notification } from "@/types/notification";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";

const NotificationsPage = () => {
  const { notifications = [], isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };
  
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    return notification.type === activeTab;
  });
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
  };
  
  return (
    <NetworkErrorBoundary>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 mb-1">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your appointments, messages, and system alerts
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={isLoading || !notifications.some(n => !n.read)}
            className="mt-4 sm:mt-0 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="appointment">Appointments</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <div className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-6 w-[120px]" />
                        <Skeleton className="h-4 w-[80px]" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredNotifications.length === 0 ? (
                <Card className="border border-blue-100 bg-blue-50/50">
                  <CardContent className="py-8 text-center">
                    <Bell className="mx-auto h-12 w-12 text-blue-300 mb-4" />
                    <h3 className="text-lg font-medium text-blue-800">No notifications</h3>
                    <p className="text-muted-foreground">
                      {activeTab === "all" ? 
                        "You don't have any notifications yet" : 
                        `You don't have any ${activeTab === "unread" ? "unread" : activeTab} notifications`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map(notification => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={markAsRead}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </NetworkErrorBoundary>
  );
};

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationCard = ({ notification, onMarkAsRead }: NotificationCardProps) => {
  const handleMarkAsRead = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };
  
  const formattedDate = notification.created_at ? 
    formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : '';
  
  return (
    <Card 
      className={cn(
        "border transition-colors",
        notification.read ? 
          "border-gray-200" : 
          "border-blue-200 bg-blue-50/50"
      )}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="flex items-center">
          {getNotificationIcon(notification.type)}
          <CardTitle className="text-lg ml-2">
            {notification.title}
          </CardTitle>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {formattedDate}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{notification.message}</p>
      </CardContent>
      {!notification.read && (
        <CardFooter className="pt-0 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAsRead}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Check className="h-4 w-4 mr-1" /> Mark as read
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default NotificationsPage;
