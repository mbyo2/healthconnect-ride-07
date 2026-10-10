import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Client-side scheduled reminders: on app load, check for appointments
 * in the next 24 hours and create in-app notifications if not already sent.
 * 
 * This is a pragmatic alternative to pg_cron — reminders are generated
 * when the patient opens the app, ensuring they see them.
 */
export const useAppointmentReminders = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkAndCreateReminders = async () => {
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find appointments in next 24h that are scheduled (accepted)
        const { data: appointments, error } = await supabase
          .from("appointments")
          .select("id, date, time, provider_id")
          .eq("patient_id", user.id)
          .eq("status", "scheduled")
          .gte("date", now.toISOString().split("T")[0])
          .lte("date", tomorrow.toISOString().split("T")[0]);

        if (error || !appointments || appointments.length === 0) return;

        // Check which already have reminders
        const appointmentIds = appointments.map((a: any) => a.id);
        const { data: existing } = await supabase
          .from("appointment_reminders")
          .select("appointment_id")
          .in("appointment_id", appointmentIds);

        const existingIds = new Set((existing || []).map((r: any) => r.appointment_id));
        const needsReminder = appointments.filter((a: any) => !existingIds.has(a.id));

        if (needsReminder.length === 0) return;

        // Get provider names
        const providerIds = Array.from(new Set(needsReminder.map((a: any) => a.provider_id).filter(Boolean)));
        let providerMap: Record<string, string> = {};
        if (providerIds.length > 0) {
          const { data: providers } = await supabase
            .from("provider_directory")
            .select("id, first_name, last_name")
            .in("id", providerIds);
          (providers || []).forEach((p: any) => {
            providerMap[p.id] = `Dr. ${p.first_name} ${p.last_name}`;
          });
        }

        // Create reminders + notifications
        for (const appt of needsReminder) {
          const providerName = providerMap[appt.provider_id] || "your provider";
          
          // Record in appointment_reminders (prevents duplicates)
          await supabase.from("appointment_reminders").insert({
            appointment_id: appt.id,
            patient_id: user.id,
            reminder_type: "24h_before",
            sent_at: new Date().toISOString(),
          });

          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: user.id,
            title: "Appointment Tomorrow",
            message: `Reminder: You have an appointment with ${providerName} tomorrow at ${appt.time}.`,
            type: "appointment_reminder",
            related_id: appt.id,
          });
        }
      } catch (error) {
        console.error("Reminder check failed:", error);
        // Non-fatal — don't block app load
      }
    };

    // Run once on mount (with small delay to not block initial render)
    const timer = setTimeout(checkAndCreateReminders, 2000);
    return () => clearTimeout(timer);
  }, [user]);
};
