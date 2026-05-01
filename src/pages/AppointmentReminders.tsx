import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  // Load existing preferences
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

  // Upcoming appointments
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
      .upsert({
        user_id: user.id,
        email_notifications: emailReminders,
        appointment_reminders: smsReminders,
        push_notifications: pushReminders,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save preferences");
      return;
    }
    toast.success("Reminder preferences saved");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointment Reminders</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Choose how you'd like to be reminded about upcoming appointments.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Reminder Channels
              </CardTitle>
              <CardDescription>
                We'll send a reminder 24 hours and 1 hour before each appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-base font-medium">Email reminders</Label>
                    <p className="text-xs text-muted-foreground">Sent to your account email</p>
                  </div>
                </div>
                <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-base font-medium">SMS reminders</Label>
                    <p className="text-xs text-muted-foreground">Text message to your phone</p>
                  </div>
                </div>
                <Switch checked={smsReminders} onCheckedChange={setSmsReminders} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-base font-medium">Push notifications</Label>
                    <p className="text-xs text-muted-foreground">In-app & mobile notifications</p>
                  </div>
                </div>
                <Switch checked={pushReminders} onCheckedChange={setPushReminders} />
              </div>

              <Button onClick={savePreferences} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>
                Reminders are scheduled automatically for these visits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No upcoming appointments</p>
                  <Button onClick={() => navigate("/search")} variant="link" size="sm" className="mt-2">
                    Book an appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
                      onClick={() => navigate(`/appointments/${apt.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{apt.type || "Appointment"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(apt.date).toLocaleDateString()} at {apt.time}
                          </p>
                        </div>
                      </div>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AppointmentRemindersPage;
