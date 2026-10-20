import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Bell, Save } from "lucide-react";
import { toast } from "sonner";

/**
 * Patient notification preferences (SMS / WhatsApp / email opt-in-out).
 * SMS is the critical channel in Zambia — reaches feature phones without data.
 */
export default function NotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    sms_enabled: true,
    whatsapp_enabled: true,
    email_enabled: true,
    push_enabled: true,
    appointment_reminders: true,
    appointment_reminder_hours: 24,
    second_reminder_hours: 2,
    lab_result_alerts: true,
    refill_reminders: true,
    medication_reminders: false,
    preferred_phone: "",
  });

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-prefs", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("patient_id", user.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (prefs) setForm((f: any) => ({ ...f, ...prefs }));
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            patient_id: user.id,
            sms_enabled: form.sms_enabled,
            whatsapp_enabled: form.whatsapp_enabled,
            email_enabled: form.email_enabled,
            push_enabled: form.push_enabled,
            appointment_reminders: form.appointment_reminders,
            appointment_reminder_hours: Number(form.appointment_reminder_hours) || 24,
            second_reminder_hours: form.second_reminder_hours
              ? Number(form.second_reminder_hours)
              : null,
            lab_result_alerts: form.lab_result_alerts,
            refill_reminders: form.refill_reminders,
            medication_reminders: form.medication_reminders,
            preferred_phone: form.preferred_phone || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "patient_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs", user?.id] });
      toast.success("Notification preferences saved");
    },
    onError: () => toast.error("Failed to save preferences"),
  });

  if (!user) return null;
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading preferences...</div>;
  }

  const Row = ({
    label,
    desc,
    field,
  }: {
    label: string;
    desc: string;
    field: string;
  }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={!!form[field]}
        onCheckedChange={(v) => setForm({ ...form, [field]: v })}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Notifications &amp; Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Phone for SMS/WhatsApp
          </label>
          <Input
            value={form.preferred_phone || ""}
            onChange={(e) => setForm({ ...form, preferred_phone: e.target.value })}
            placeholder="+260 9XX XXX XXX (leave blank to use your profile number)"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            SMS reaches any phone — no smartphone or data needed.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">Channels</p>
          <Row label="SMS" desc="Text message reminders" field="sms_enabled" />
          <Row label="WhatsApp" desc="WhatsApp message reminders" field="whatsapp_enabled" />
          <Row label="Email" desc="Email notifications" field="email_enabled" />
          <Row label="App notifications" desc="In-app / push notifications" field="push_enabled" />
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">What to remind me about</p>
          <Row
            label="Appointment reminders"
            desc="Before your appointments"
            field="appointment_reminders"
          />
          {form.appointment_reminders && (
            <div className="flex items-center gap-3 py-2 pl-1">
              <label className="text-xs text-muted-foreground">Remind me</label>
              <Input
                type="number"
                min={1}
                max={168}
                value={form.appointment_reminder_hours}
                onChange={(e) =>
                  setForm({ ...form, appointment_reminder_hours: e.target.value })
                }
                className="w-20"
              />
              <label className="text-xs text-muted-foreground">hours before, and again</label>
              <Input
                type="number"
                min={0}
                max={48}
                value={form.second_reminder_hours ?? ""}
                onChange={(e) =>
                  setForm({ ...form, second_reminder_hours: e.target.value })
                }
                className="w-20"
              />
              <label className="text-xs text-muted-foreground">hours before (optional)</label>
            </div>
          )}
          <Row label="Lab results ready" desc="When your results are available" field="lab_result_alerts" />
          <Row label="Prescription refills" desc="When a refill is ready" field="refill_reminders" />
          <Row label="Medication reminders" desc="Daily dose reminders" field="medication_reminders" />
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
