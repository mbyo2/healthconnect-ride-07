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
      case "appointment": return <Calendar className="h-5 w-5 text-[#0073ea]" />;
      case "message": return <MessageSquare className="h-5 w-5 text-[#00c875]" />;
      case "alert": return <AlertCircle className="h-5 w-5 text-[#e2445c]" />;
      case "reminder": return <Pill className="h-5 w-5 text-[#fdab3d]" />;
      case "connection": return <Users className="h-5 w-5 text-[#a25ddc]" />;
      default: return <FileText className="h-5 w-5 text-[#676879]" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                System Notifications & Real-Time Alerts
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                {unreadCount > 0 ? `${unreadCount} unread system notifications` : "All notifications read"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
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
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-[#e6e9ef] text-[#676879] hover:bg-[#f0f2f7]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-[#676879]">
              Loading notification stream...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#676879]">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#0073ea]" />
              <p className="font-bold">No notifications found.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e6e9ef]">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${!notification.read ? "bg-[#e5f0ff]/40" : "hover:bg-[#f5f6f8]"}`}
                >
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 rounded-xl bg-white border border-[#e6e9ef] shadow-2xs">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                            {notification.title}
                          </h3>
                          <p className="text-xs text-[#676879] mt-0.5 font-medium">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-[#676879] font-bold mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#0073ea]">New</span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="px-3 py-1 rounded-md border border-[#c3c6d4] bg-white text-xs font-bold flex items-center gap-1 hover:bg-[#f0f2f7]"
                          >
                            <Check className="h-3.5 w-3.5 text-[#00c875]" /> Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="px-3 py-1 rounded-md text-[#e2445c] hover:bg-[#ffeef0] text-xs font-bold flex items-center gap-1"
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
