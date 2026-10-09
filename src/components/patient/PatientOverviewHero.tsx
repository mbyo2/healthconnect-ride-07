import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Pill,
  FlaskConical,
  MessageCircle,
  ArrowRight,
  Search,
  Video,
  FileText,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCountUp } from "@/hooks/use-count-up";
import { format, isToday, isTomorrow } from "date-fns";

interface NextAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  provider_name: string;
  specialty: string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function friendlyDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE, MMM d");
  } catch {
    return dateStr;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
  onClick: () => void;
}) {
  const animated = useCountUp(value);
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-2"
      aria-label={`${label}: ${value}`}
    >
      <div className={`inline-flex p-2.5 rounded-xl ${accent} mb-3`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="text-3xl font-bold tabular-nums tracking-tight">{animated}</div>
      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
        {label}
        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" aria-hidden />
      </div>
    </button>
  );
}

/**
 * Zocdoc-style patient overview: greeting hero, animated stat cards,
 * next-appointment spotlight, and quick actions. Sits above the tabbed
 * dashboard content.
 */
export function PatientOverviewHero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [rxCount, setRxCount] = useState(0);
  const [labPending, setLabPending] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextAppt, setNextAppt] = useState<NextAppointment | null>(null);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        const [appts, rx, labs, msgs, profile] = await Promise.all([
          (supabase as any)
            .from("appointments")
            .select("id, appointment_date, appointment_time, appointment_type, provider_id")
            .eq("patient_id", user.id)
            .gte("appointment_date", today)
            .neq("status", "cancelled")
            .order("appointment_date", { ascending: true })
            .order("appointment_time", { ascending: true })
            .limit(10),
          (supabase as any)
            .from("comprehensive_prescriptions")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", user.id)
            .in("status", ["pending", "partially_filled"]),
          (supabase as any)
            .from("lab_tests")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", user.id)
            .not("status", "in", "(completed,cancelled)"),
          (supabase as any)
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("read", false),
          (supabase as any)
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const apptRows = (appts.data || []) as any[];
        setUpcomingCount(apptRows.length);

        // Enrich the next appointment with provider name (best effort)
        if (apptRows.length > 0) {
          const first = apptRows[0];
          let providerName = "Your provider";
          let specialty = "";
          try {
            const { data: prov } = await (supabase as any)
              .from("profiles")
              .select("first_name, last_name, specialty")
              .eq("id", first.provider_id)
              .maybeSingle();
            if (prov) {
              providerName = `Dr. ${prov.first_name} ${prov.last_name}`.trim();
              specialty = prov.specialty || "";
            }
          } catch { /* keep fallback */ }
          setNextAppt({
            id: first.id,
            appointment_date: first.appointment_date,
            appointment_time: first.appointment_time,
            appointment_type: first.appointment_type || "Visit",
            provider_name: providerName,
            specialty,
          });
        }

        setRxCount(rx.count ?? 0);
        setLabPending(labs.count ?? 0);
        setUnreadCount(msgs.count ?? 0);
        if (profile.data?.first_name) setFirstName(profile.data.first_name);
      } catch {
        /* hero is decorative — dashboard still works without it */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 h-32" />
        ))}
      </div>
    );
  }

  const quickActions = [
    { icon: Search, label: "Find a doctor", action: () => navigate("/search") },
    { icon: CalendarDays, label: "Book visit", action: () => navigate("/search") },
    { icon: Video, label: "Telehealth", action: () => navigate("/video-dashboard") },
    { icon: FileText, label: "My records", action: () => navigate("/medical-records") },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting hero with next appointment spotlight */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium">
                {greeting()}{firstName ? `, ${firstName}` : ""}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">
                How are you feeling today?
              </h2>
              <p className="text-primary-foreground/80 text-sm mt-2 max-w-md">
                Book a visit, check your prescriptions, or message your care team — all in one place.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {quickActions.map(({ icon: Icon, label, action }) => (
                  <Button
                    key={label}
                    variant="secondary"
                    size="sm"
                    onClick={action}
                    className="gap-2 bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {nextAppt ? (
              <button
                onClick={() => navigate("/appointments")}
                className="shrink-0 text-left rounded-2xl bg-white/12 hover:bg-white/20 backdrop-blur border border-white/20 p-5 w-full md:w-72 transition-colors"
                aria-label={`Next appointment: ${nextAppt.provider_name}, ${friendlyDate(nextAppt.appointment_date)} at ${nextAppt.appointment_time}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Upcoming appointment
                </p>
                <p className="font-bold text-lg mt-2">{nextAppt.provider_name}</p>
                {nextAppt.specialty && (
                  <p className="text-sm text-primary-foreground/75">{nextAppt.specialty}</p>
                )}
                <p className="text-sm mt-2 font-medium">
                  {friendlyDate(nextAppt.appointment_date)} · {nextAppt.appointment_time}
                </p>
                <p className="text-xs text-primary-foreground/70 mt-1">{nextAppt.appointment_type}</p>
              </button>
            ) : (
              <button
                onClick={() => navigate("/search")}
                className="shrink-0 rounded-2xl bg-white/12 hover:bg-white/20 backdrop-blur border border-white/20 p-5 w-full md:w-72 transition-colors text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                  No upcoming visits
                </p>
                <p className="font-bold text-lg mt-2">Book your next appointment</p>
                <p className="text-sm text-primary-foreground/75 mt-1 flex items-center gap-1">
                  Find a doctor near you <ArrowRight className="h-4 w-4" aria-hidden />
                </p>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Animated stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          label="Upcoming visits"
          value={upcomingCount}
          accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          onClick={() => navigate("/appointments")}
        />
        <StatCard
          icon={Pill}
          label="Active prescriptions"
          value={rxCount}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          onClick={() => navigate("/medications")}
        />
        <StatCard
          icon={FlaskConical}
          label="Lab results pending"
          value={labPending}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          onClick={() => navigate("/medical-records")}
        />
        <StatCard
          icon={MessageCircle}
          label="Unread messages"
          value={unreadCount}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          onClick={() => navigate("/chat")}
        />
      </div>
    </div>
  );
}
