import { useState, useEffect } from "react";
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
      default: return <FileText className="h-5 w-5 text-graphite-500 dark:text-slate-400" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                System Notifications & Real-Time Alerts
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" aria-hidden />
                <span className="sr-only">Live notifications</span>
              </h1>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : "All notifications read"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
                    <button
                onClick={markAllAsRead}
                aria-label={unreadCount > 0 ? `Mark all ${unreadCount} notifications as read` : 'Mark all as read'}
                className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="max-w-[1500px] mx-auto mt-4 flex items-center gap-2">
          {[
            { id: "all", label: `All Notifications (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                filter === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-canvas-silk text-graphite-500 dark:text-slate-400 hover:bg-canvas-mist dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-graphite-500 dark:text-slate-400">
              Loading notification stream...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-graphite-500 dark:text-slate-400">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary-500" />
              <p className="font-bold">No notifications found.</p>
            </div>
          ) : (
            <div className="divide-y divide-canvas-silk">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${!notification.read ? "bg-primary-50/40" : "hover:bg-canvas dark:bg-slate-950"}`}
                >
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 rounded-xl bg-white border border-canvas-silk shadow-2xs">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                            {notification.title}
                          </h3>
                          <p className="text-xs text-graphite-500 dark:text-slate-400 mt-0.5 font-medium">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-graphite-500 dark:text-slate-400 font-bold mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-primary-500">New</span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      aria-label={`Mark as read: ${notification.title}`}
                      className="px-3 py-1 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold flex items-center gap-1 hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <Check className="h-3.5 w-3.5 text-success-500" /> Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    aria-label={`Delete notification: ${notification.title}`}
                    className="px-3 py-1 rounded-md text-error-500 hover:bg-error-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1"
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
