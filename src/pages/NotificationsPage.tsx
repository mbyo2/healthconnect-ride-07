import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, CheckCheck, Trash2, Calendar, MessageSquare, AlertCircle, FileText, Pill, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "appointment" | "message" | "system" | "reminder" | "alert" | "connection";
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: any;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as any) || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications" as any)
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("notifications" as any)
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications" as any).delete().eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "appointment": return <Calendar className="h-5 w-5 text-primary-500" />;
      case "message": return <MessageSquare className="h-5 w-5 text-success-500" />;
      case "alert": return <AlertCircle className="h-5 w-5 text-error-500" />;
      case "reminder": return <Pill className="h-5 w-5 text-warning-500" />;
      case "connection": return <Users className="h-5 w-5 text-purple-500" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="pb-16">
      {/* Sticky Monday Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-semibold text-sm shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                Notifications
                <span className="w-2 h-2 rounded-full bg-success-500" aria-hidden />
                <span className="sr-only">Live notifications</span>
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : "All notifications read"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
                    <button
                onClick={markAllAsRead}
                aria-label={unreadCount > 0 ? `Mark all ${unreadCount} notifications as read` : 'Mark all as read'}
                className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="mt-4 flex items-center gap-2">
          {[
            { id: "all", label: `All Notifications (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all ${
                filter === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3" role="status" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full doc-shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 doc-shimmer rounded" />
                    <div className="h-3 w-3/5 doc-shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Bell}
                title="No notifications found"
                description="You're all caught up. New notifications will appear here."
                actionLabel={filter === "unread" ? "Show all notifications" : "Browse Doctors"}
                onAction={filter === "unread" ? () => setFilter("all") : () => navigate('/search')}
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${!notification.read ? "bg-primary-50/40" : "hover:bg-background"}`}
                >
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-xs text-foreground">
                            {notification.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground font-semibold mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-primary-500">New</span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      aria-label={`Mark as read: ${notification.title}`}
                      className="px-3 py-1 min-h-[44px] rounded-md border border-border bg-card text-xs font-semibold flex items-center gap-1 hover:bg-muted dark:hover:bg-slate-700"
                    >
                      <Check className="h-3.5 w-3.5 text-success-500" /> Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    aria-label={`Delete notification: ${notification.title}`}
                    className="px-3 py-1 min-h-[44px] rounded-md text-error-500 hover:bg-error-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
