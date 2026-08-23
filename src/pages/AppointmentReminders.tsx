import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Smartphone, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AppointmentRemindersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(false);
  const [pushReminders, setPushReminders] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEmailReminders(data.email_notifications ?? true);
        setSmsReminders(data.appointment_reminders ?? false);
        setPushReminders(data.push_notifications ?? true);
      }
    })();
  }, [user]);

  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming-appointments-reminders", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time, type, status")
        .eq("patient_id", user!.id)
        .gte("date", today)
        .neq("status", "cancelled")
        .order("date")
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const savePreferences = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("notification_settings")
      .upsert(
        {
          user_id: user.id,
          email_notifications: emailReminders,
          appointment_reminders: smsReminders,
          push_notifications: pushReminders,
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      toast.error("Failed to save preferences");
      return;
    }
    toast.success("Reminder preferences saved");
  };

  const downloadIcs = (apt: any) => {
    const title = `Medical Visit (${apt.type || "Consultation"}) — Doc' O Clock`;
    const startDateStr = `${apt.date.replace(/[-]/g, "")}T${(apt.time || "09:00").replace(/[:]/g, "")}00`;
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Doc O Clock Healthcare System//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DESCRIPTION:Your upcoming visit with Doc' O Clock. Manage at https://doc0clock.online/appointments/${apt.id}`,
      `DTSTART:${startDateStr}`,
      `DTEND:${startDateStr}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment-${apt.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar event (.ics) saved!");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
        {/* Sticky Monday Top Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-[1500px] mx-auto flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Automated Appointment Reminders & Calendar Sync
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Configure 24-hour and 1-hour pre-visit alerts via Push, Email, SMS, and iCal / Google Calendar sync
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* Reminder Channel Preferences */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h2 className="font-extrabold text-sm flex items-center gap-2 border-b border-[#e6e9ef] pb-3">
              <Bell className="h-4 w-4 text-[#0073ea]" /> Automated Reminder Dispatch Channels
            </h2>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white text-[#0073ea]">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-extrabold text-xs">Email Notifications</p>
                  <p className="text-[11px] text-[#676879]">Sent to registered patient email address</p>
                </div>
              </div>
              <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white text-[#00c875]">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-extrabold text-xs">SMS Text Reminders</p>
                  <p className="text-[11px] text-[#676879]">Cellular SMS text dispatched to mobile phone</p>
                </div>
              </div>
              <Switch checked={smsReminders} onCheckedChange={setSmsReminders} />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white text-[#a25ddc]">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-extrabold text-xs">Push Notifications</p>
                  <p className="text-[11px] text-[#676879]">Browser push & mobile app push alerts</p>
                </div>
              </div>
              <Switch checked={pushReminders} onCheckedChange={setPushReminders} />
            </div>

            <button
              onClick={savePreferences}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all"
            >
              {saving ? "Saving Dispatch Settings..." : "Save Dispatch Preferences"}
            </button>
          </div>

          {/* Upcoming Visits & Calendar Sync */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h2 className="font-extrabold text-sm flex items-center gap-2 border-b border-[#e6e9ef] pb-3">
              <Calendar className="h-4 w-4 text-[#00c875]" /> Upcoming Visits & iCal Export
            </h2>

            {upcoming.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#676879]">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#0073ea]" />
                <p className="font-bold">No upcoming appointments scheduled.</p>
                <button
                  onClick={() => navigate("/search")}
                  className="mt-2 text-xs font-bold text-[#0073ea] hover:underline"
                >
                  Book an appointment now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl text-[#0073ea] border border-[#e6e9ef]">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-slate-900">{apt.type || "Medical Consultation"}</p>
                        <p className="text-[11px] text-[#676879] font-medium">
                          {new Date(apt.date).toLocaleDateString()} at {apt.time}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadIcs(apt)}
                      className="px-4 py-2 rounded-xl bg-white border border-[#c3c6d4] text-[#0073ea] font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#e5f0ff]"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Sync to Calendar (.ics)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AppointmentRemindersPage;
