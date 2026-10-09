import { format, isToday as isTodayFn } from "date-fns";
import { CalendarX2, ChevronLeft, ChevronRight, Video, MapPin, ChevronRight as GoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgendaAppointment {
  id: string;
  date: string;
  time: string; // "HH:MM" or "HH:MM:SS"
  status: string;
  type: string;
  patient?: { first_name?: string; last_name?: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-primary-500",
  confirmed: "bg-primary-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
  no_show: "bg-amber-500",
};

const STATUS_PILL: Record<string, string> = {
  scheduled: "bg-primary-500/15 text-primary-600 dark:text-primary-400",
  confirmed: "bg-primary-500/15 text-primary-600 dark:text-primary-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-slate-500/15 text-slate-500 dark:text-slate-400",
  no_show: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function shortTime(t: string): string {
  return t.slice(0, 5);
}

function patientName(a: AgendaAppointment): string {
  const n = [a.patient?.first_name, a.patient?.last_name].filter(Boolean).join(" ");
  return n || "Patient";
}

function isVideo(a: AgendaAppointment): boolean {
  return a.type === "video_consultation" || a.type === "telemedicine";
}

/**
 * Reference-inspired day agenda: a vertical timeline of the provider's
 * appointments for one day, phone-first (the old 850px-wide table was
 * unusable on small screens). Day navigator, up-next highlighting for
 * today, status-colored rail dots, and 44px touch targets throughout.
 */
export function AgendaTimeline({
  appointments,
  selectedDate,
  onDateChange,
  onManage,
  onViewAll,
  loading,
}: {
  appointments: AgendaAppointment[];
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  onManage: (appointmentId: string) => void;
  onViewAll: () => void;
  loading?: boolean;
}) {
  const showingToday = isTodayFn(selectedDate);

  // Next upcoming appointment when viewing today (for the "Up next" badge).
  const nowHHMM = format(new Date(), "HH:mm");
  const upNextId = showingToday
    ? appointments.find(
        (a) => (a.status === "scheduled" || a.status === "confirmed") && shortTime(a.time) >= nowHHMM
      )?.id
    : undefined;

  const go = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    onDateChange(d);
  };

  const dateLabel = showingToday
    ? `Today, ${format(selectedDate, "MMM d")}`
    : format(selectedDate, "EEE, MMM d");

  return (
    <section
      aria-label="Appointment agenda"
      className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
    >
      {/* Day navigator */}
      <div className="px-3 py-2.5 bg-primary-50 dark:bg-blue-950/40 border-b border-canvas-silk dark:border-slate-800 border-l-4 border-l-primary-500 flex items-center justify-between gap-2">
        <button
          onClick={() => go(-1)}
          aria-label="Previous day"
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 truncate">
            {dateLabel}
          </h2>
          <span
            aria-label={`${appointments.length} appointments`}
            className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-primary-500 text-white shrink-0"
          >
            {appointments.length}
          </span>
          {!showingToday && (
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3 min-h-[44px] rounded-full text-xs font-bold bg-primary-500/15 text-primary-600 dark:text-primary-400 hover:bg-primary-500/25 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => go(1)}
          aria-label="Next day"
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading agenda…</div>
      ) : appointments.length === 0 ? (
        <div className="p-8 text-center">
          <CalendarX2 className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" aria-hidden />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No appointments on {format(selectedDate, "EEEE, MMM d")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Your schedule is clear. New bookings will appear here.
          </p>
          <button
            onClick={onViewAll}
            className="px-4 min-h-[44px] rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            View all appointments
          </button>
        </div>
      ) : (
        <ul className="relative px-4 py-4 space-y-1">
          {/* vertical rail */}
          <span
            aria-hidden
            className="absolute top-6 bottom-6 left-[4.7rem] w-px bg-canvas-silk dark:bg-slate-800"
          />
          {appointments.map((app) => {
            const dot = STATUS_STYLES[app.status] ?? "bg-slate-400";
            const pill = STATUS_PILL[app.status] ?? "bg-slate-500/15 text-slate-500";
            const isUpNext = app.id === upNextId;
            const past =
              showingToday &&
              (app.status === "completed" || app.status === "cancelled" || shortTime(app.time) < nowHHMM);
            return (
              <li key={app.id} className="relative flex gap-3 items-stretch">
                {/* time gutter */}
                <div className="w-14 shrink-0 pt-3 text-right">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {shortTime(app.time)}
                  </span>
                </div>
                {/* rail dot */}
                <div className="relative w-6 shrink-0 flex justify-center" aria-hidden>
                  <span className={cn("mt-[1.15rem] h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 z-10", dot)} />
                </div>
                {/* card */}
                <div
                  className={cn(
                    "flex-1 mb-3 rounded-2xl border p-3 flex items-center gap-3",
                    "border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-800/60",
                    isUpNext && "border-primary-500 ring-1 ring-primary-500",
                    past && "opacity-60"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {patientName(app)}
                      </p>
                      {isUpNext && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-500 text-white">
                          Up next
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300">
                        {isVideo(app) ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {isVideo(app) ? "Video" : "In-person"}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", pill)}>
                        {app.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onManage(app.id)}
                    aria-label={`Manage appointment with ${patientName(app)} at ${shortTime(app.time)}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <GoIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* footer */}
      <div className="px-4 py-2 border-t border-canvas-silk dark:border-slate-800 flex justify-end">
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-primary-500 hover:underline flex items-center gap-1 min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          View all <GoIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
