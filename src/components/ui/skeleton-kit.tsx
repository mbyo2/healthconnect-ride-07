import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton kit — YouTube-style loading placeholders for Doc'O Clock.
 *
 * Every piece composes the base <Skeleton /> (.doc-shimmer: token-driven,
 * dark-mode-safe, static under reduced motion). Shapes MIRROR the real
 * components they precede — avatar blocks where avatars go, lines where
 * text goes, card shells with the same padding/radius — so content
 * arrives without layout shift. Use these instead of page-level spinners
 * or blank waits; small inline spinners inside buttons stay as-is
 * (action feedback, not page loading).
 *
 * All pieces are aria-hidden: the parent surface owns the loading
 * announcement (role="status" / sr-only text) where it matters.
 */

/* ─── Primitives ─── */

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("h-4 w-full", className)} />;
}

export function SkeletonCircle({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("h-10 w-10 shrink-0 rounded-full", className)} />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("h-24 w-full rounded-2xl", className)} />;
}

/** Card shell with the app's card geometry; children compose the inside. */
export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-2xl border border-canvas-silk bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      {children ?? (
        <div className="space-y-3">
          <SkeletonLine className="h-5 w-1/2" />
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-2/3" />
        </div>
      )}
    </div>
  );
}

/** One list row: avatar circle + two text lines + optional trailing block. */
export function SkeletonListRow({
  avatar = true,
  action = false,
  className,
}: {
  avatar?: boolean;
  action?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3 py-3", className)}>
      {avatar && <SkeletonCircle className="h-11 w-11" />}
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine className="h-4 w-1/2" />
        <SkeletonLine className="h-3 w-1/3" />
      </div>
      {action && <Skeleton className="h-9 w-20 shrink-0 rounded-pill" />}
    </div>
  );
}

/** Table body rows for use inside a real <tbody> (keeps column geometry). */
export function SkeletonTableRows({
  rows = 5,
  cells = 5,
  cellClassName,
  rowClassName,
}: {
  rows?: number;
  cells?: number;
  cellClassName?: string;
  rowClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden className={rowClassName}>
          {Array.from({ length: cells }).map((_, c) => (
            <td key={c} className={cn("py-3 px-3", cellClassName)}>
              <SkeletonLine className={cn("h-3.5", c === 0 ? "w-20" : c % 2 ? "w-24" : "w-16")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── Composites mirroring real surfaces ─── */

/** Dashboard stat card — mirrors MetricCard (label, big value, icon box). */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-2xl border border-canvas-silk bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-7 w-16" />
          <SkeletonLine className="h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/** Search/directory result — mirrors the ProviderList card element for
 * element: photo + name + star-rating row + specialty/fee line, capability
 * badge pills, two-line bio, location line, and the footer with its
 * availability chip and all THREE action buttons. */
export function SkeletonProviderCard() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-canvas-silk bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {/* Header: avatar + name / rating / specialty-fee */}
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <SkeletonLine className="h-4 w-1/2" />
          <div className="flex items-center gap-1 pt-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-3 w-3 rounded-[4px]" />
            ))}
            <SkeletonLine className="ml-1 h-3 w-8" />
          </div>
          <SkeletonLine className="h-3 w-2/3" />
        </div>
      </div>
      {/* Capability badges */}
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      {/* Bio preview (2 lines) */}
      <div className="mb-2.5 space-y-2">
        <SkeletonLine className="h-3.5 w-full" />
        <SkeletonLine className="h-3.5 w-4/5" />
      </div>
      {/* Practice location */}
      <SkeletonLine className="mb-2.5 h-3 w-44" />
      {/* Footer: availability chip + Estimate / Profile / Book buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-canvas-silk pt-2.5 dark:border-slate-800">
        <Skeleton className="h-6 w-28 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-[104px] rounded-md" />
          <Skeleton className="h-11 w-[92px] rounded-md" />
          <Skeleton className="h-11 w-[132px] rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Search page header — mirrors SearchResults' title block + view toggle
 * + sort select row (replaces the old single grey bar). */
export function SkeletonSearchHeader() {
  return (
    <div aria-hidden className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-64 max-w-full" />
        <SkeletonLine className="h-4 w-40" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-canvas-silk bg-canvas-bone p-1 dark:border-slate-800 dark:bg-slate-800/60">
          <Skeleton className="h-11 w-20 rounded-md" />
          <Skeleton className="h-11 w-20 rounded-md" />
        </div>
        <Skeleton className="h-11 w-36 rounded-pill" />
      </div>
    </div>
  );
}

/** Provider profile page — mirrors ProviderDetail's header card + columns. */
export function SkeletonProviderProfile() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <SkeletonLine className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <div className="flex flex-col gap-5 rounded-2xl border border-canvas-silk bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <Skeleton className="h-28 w-28 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <SkeletonLine className="h-6 w-64 max-w-full" />
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-4 w-56 max-w-full" />
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-36" />
        </div>
        <SkeletonCard className="h-64" />
      </div>
    </div>
  );
}

/** Generic dashboard body — title, stat grid, chart card, list rows. */
export function SkeletonDashboardBody({ statCount = 4 }: { statCount?: number }) {
  return (
    <div aria-hidden className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-56 max-w-full" />
        <SkeletonLine className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonStatGrid count={statCount} />
      <SkeletonCard>
        <SkeletonLine className="mb-4 h-5 w-36" />
        <SkeletonBlock className="h-48" />
      </SkeletonCard>
      <div className="divide-y divide-canvas-silk rounded-2xl border border-canvas-silk bg-white px-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {[0, 1, 2].map((i) => (
          <SkeletonListRow key={i} action />
        ))}
      </div>
    </div>
  );
}

/** Settings/profile form — label + input rows, mirrors a settings card. */
export function SkeletonForm({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine className="h-3.5 w-28" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-36 rounded-pill" />
    </div>
  );
}

/** Shimmer block for use ON dark surfaces (slate-900 banners/headers),
 * where the default muted block would be nearly invisible. */
export function SkeletonOnDark({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("doc-shimmer-on-dark", className)} />;
}

/* ─── Patient home (PatientWorkflow dashboard) ─── */

/** Health metric card — mirrors HealthMetricCards: icon box + label + value. */
export function SkeletonMetricCard() {
  return (
    <div
      aria-hidden
      className="flex min-h-[112px] flex-col justify-center rounded-2xl border border-canvas-silk bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-2">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="h-7 w-20" />
        </div>
      </div>
    </div>
  );
}

/** Doctor row — mirrors DoctorCard (avatar, name, star row, specialty/fee). */
export function SkeletonDoctorRow() {
  return (
    <div
      aria-hidden
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <SkeletonCircle className="h-14 w-14" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonLine className="h-4 w-36 max-w-full" />
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3 w-3 rounded-[4px]" />
          ))}
          <SkeletonLine className="ml-1 h-3 w-6" />
        </div>
        <SkeletonLine className="h-3 w-28" />
      </div>
    </div>
  );
}

/**
 * Patient home dashboard — a structural twin of PatientWorkflow's loaded
 * layout, block for block: triage banner, date/bell header bar, care-mode
 * toggle, the DARK next-appointment banner, health metric cards,
 * specialties squircle grid, available-doctor rows and quick-access grid.
 */
export function SkeletonPatientHome() {
  return (
    <div aria-hidden className="space-y-6 sm:space-y-8">
      {/* AI triage entry banner (solid primary bar) */}
      <div className="flex w-full items-center gap-4 rounded-2xl bg-primary-500 p-4 shadow-xs sm:p-5">
        <SkeletonOnDark className="h-[52px] w-[52px] shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonOnDark className="h-5 w-44 max-w-full rounded-md" />
          <SkeletonOnDark className="h-3.5 w-72 max-w-full rounded-md" />
        </div>
        <SkeletonOnDark className="h-5 w-5 shrink-0 rounded-md" />
      </div>

      {/* Date + notification bell header bar */}
      <div className="flex items-center justify-between rounded-2xl border border-canvas-silk bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonLine className="h-3 w-10" />
            <SkeletonLine className="h-5 w-36" />
          </div>
        </div>
        <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-2xl" />
      </div>

      {/* Online / offline care-mode toggle */}
      <div className="flex justify-center">
        <div className="flex w-full max-w-md gap-1 rounded-2xl border border-canvas-silk bg-canvas-mist p-1 shadow-xs dark:border-slate-700 dark:bg-slate-800/80">
          <Skeleton className="h-[46px] flex-1 rounded-xl" />
          <Skeleton className="h-[46px] flex-1 rounded-xl" />
        </div>
      </div>

      {/* Next appointment banner (dark slate in both modes) */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:flex-row sm:items-center sm:p-6">
        <div className="space-y-2">
          <SkeletonOnDark className="h-3 w-32 rounded-md" />
          <SkeletonOnDark className="h-6 w-64 max-w-full rounded-md" />
          <SkeletonOnDark className="h-3 w-48 rounded-md" />
        </div>
        <SkeletonOnDark className="h-10 w-32 shrink-0 rounded-full" />
      </div>

      {/* Health metric cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonLine className="h-5 w-24" />
          <SkeletonLine className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>
      </div>

      {/* Specialties squircle grid */}
      <div>
        <div className="mb-3.5 flex items-center justify-between px-1">
          <div className="space-y-1.5">
            <SkeletonLine className="h-6 w-28" />
            <SkeletonLine className="h-3 w-44" />
          </div>
          <SkeletonLine className="h-3 w-14" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-canvas-silk bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <SkeletonLine className="h-3.5 w-16" />
              <SkeletonLine className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Available doctors */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <SkeletonLine className="h-6 w-36" />
          <SkeletonLine className="h-3 w-14" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <SkeletonDoctorRow key={i} />
          ))}
        </div>
      </div>

      {/* Quick access grid */}
      <div>
        <SkeletonLine className="mb-3.5 h-6 w-28 px-1" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-canvas-silk bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <SkeletonLine className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Appointments ─── */

/** Patient appointment card — mirrors AppointmentsList's Card: name,
 * specialty, date/time meta lines, status badge, right button stack.
 * (The real card has NO avatar — neither does this twin.) */
export function SkeletonAppointmentCard() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-canvas-silk bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <SkeletonLine className="h-6 w-52 max-w-full" />
          <SkeletonLine className="mt-1.5 h-4 w-32" />
          <div className="mt-2.5 flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <SkeletonLine className="h-4 w-44" />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <SkeletonLine className="h-4 w-24" />
          </div>
          <Skeleton className="mt-2.5 h-6 w-20 rounded-full" />
        </div>
        <div className="flex w-full flex-col gap-2 md:w-36">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Appointments board — mirrors the Appointments page group: the dark
 * slate group header (title + count pill), the 6-column table on
 * desktop, and the stacked cards on mobile.
 */
export function SkeletonAppointmentsBoard() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Group header — dark in both modes, like the real one */}
      <div className="flex items-center gap-3 bg-slate-900 px-5 py-4">
        <SkeletonOnDark className="h-2 w-2 shrink-0 rounded-full" />
        <SkeletonOnDark className="h-4 w-56 max-w-full rounded-md" />
        <SkeletonOnDark className="h-5 w-8 shrink-0 rounded-full" />
      </div>

      {/* Desktop table twin */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-canvas-silk bg-canvas dark:border-slate-800 dark:bg-slate-950">
              <th className="w-[240px] px-6 py-3"><SkeletonLine className="h-3 w-20" /></th>
              <th className="w-[140px] px-3 py-3"><SkeletonLine className="mx-auto h-3 w-12" /></th>
              <th className="w-[150px] px-3 py-3"><SkeletonLine className="h-3 w-20" /></th>
              <th className="w-[130px] px-3 py-3"><SkeletonLine className="h-3 w-16" /></th>
              <th className="w-[180px] px-3 py-3"><SkeletonLine className="h-3 w-24" /></th>
              <th className="w-[150px] px-3 py-3"><SkeletonLine className="mx-auto h-3 w-14" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
            {[0, 1, 2, 3].map((r) => (
              <tr key={r}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <SkeletonCircle className="h-9 w-9" />
                    <div>
                      <SkeletonLine className="h-3.5 w-28" />
                      <div className="mt-1.5 flex gap-1">
                        <Skeleton className="h-5 w-14 rounded-md" />
                        <Skeleton className="h-5 w-16 rounded-md" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-center">
                  <Skeleton className="mx-auto h-6 w-16 rounded-full" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonLine className="h-3.5 w-20" />
                  <SkeletonLine className="mt-1.5 h-3 w-12" />
                </td>
                <td className="px-3 py-4">
                  <Skeleton className="h-7 w-20 rounded-full" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonLine className="h-3.5 w-28" />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Skeleton className="h-8 w-14 rounded-md" />
                    <Skeleton className="h-8 w-14 rounded-md" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card twin */}
      <div className="sm:hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="m-3 rounded-2xl border border-canvas-silk bg-canvas p-3 dark:border-slate-800 dark:bg-slate-800/60"
          >
            <div className="flex items-start gap-3">
              <SkeletonCircle className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <SkeletonLine className="h-3.5 w-32 max-w-full" />
                <SkeletonLine className="mt-1 h-3 w-20" />
                <div className="mt-1.5 flex gap-1">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 shrink-0 rounded-full" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <SkeletonLine className="h-3 w-28" />
              <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Provider dashboard ─── */

/**
 * Provider dashboard top — mirrors ProviderDashboard: header actions,
 * the vf-card stat row (label / big value / sub-line — no icon box),
 * quick-action chips, tab bar, and today's appointment rows.
 */
export function SkeletonProviderDashboard() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-52 max-w-full" />
          <SkeletonLine className="h-4 w-64 max-w-full" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-11 w-32 rounded-pill" />
          <Skeleton className="h-11 w-28 rounded-pill" />
        </div>
      </div>

      {/* Stat row — vf-card geometry (p-6), text-only like the real cards */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="vf-card space-y-3">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-8 w-14" />
            <SkeletonLine className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Quick-action chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-xl border border-canvas-silk bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <SkeletonLine className="h-3.5 w-12" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="inline-flex gap-1 rounded-xl border border-canvas-silk bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Today's appointments */}
      <div className="rounded-2xl border border-canvas-silk bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <SkeletonLine className="mb-2 h-4 w-44" />
        <div className="divide-y divide-canvas-silk dark:divide-slate-800">
          {[0, 1, 2].map((i) => (
            <SkeletonListRow key={i} action />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Institution dashboard ─── */

/**
 * Institution dashboard — mirrors InstitutionDashboard's overview:
 * page header, module tab chips, KPI MetricCards, the quick-access
 * tile card, the modules card, and the two-column card rows.
 */
export function SkeletonInstitutionDashboard() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-72 max-w-full" />
        <SkeletonLine className="h-4 w-96 max-w-full" />
      </div>

      {/* Module tab chips */}
      <div className="flex gap-1.5 overflow-hidden border-b border-canvas-silk pb-2 dark:border-slate-800">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-xl" />
        ))}
      </div>

      {/* KPI cards (MetricCard twin) */}
      <SkeletonStatGrid />

      {/* Quick-access modules card */}
      <div className="rounded-2xl border border-canvas-silk bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <SkeletonLine className="mb-3 h-3 w-44" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-xl border border-canvas-silk p-3 dark:border-slate-700"
            >
              <Skeleton className="h-8 w-8 rounded-lg" />
              <SkeletonLine className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Modules card */}
      <div className="rounded-2xl border border-canvas-silk bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <SkeletonLine className="mb-1.5 h-3 w-32" />
        <SkeletonLine className="mb-3 h-3 w-64 max-w-full" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Two-column card rows */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SkeletonCard className="h-52" />
        <SkeletonCard className="h-52" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SkeletonCard className="h-52" />
        <SkeletonCard className="h-52" />
      </div>
    </div>
  );
}

/* ─── Pharmacy marketplace ─── */

/** Product card — mirrors marketplace/ProductCard: header (pill icon,
 * name, generic, Rx badge), dosage/price/stock rows, pharmacy line,
 * description, and the full-width Add to Cart footer button. */
export function SkeletonProductCard() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col rounded-xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="px-6 pb-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <div className="space-y-1.5">
              <SkeletonLine className="h-5 w-32" />
              <SkeletonLine className="h-3.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-4 w-14" />
            <SkeletonLine className="h-4 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-4 w-10" />
            <SkeletonLine className="h-6 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-4 w-16" />
            <SkeletonLine className="h-4 w-16" />
          </div>
          <SkeletonLine className="h-4 w-40 pt-1" />
          <div className="space-y-2 pt-1">
            <SkeletonLine className="h-3.5 w-full" />
            <SkeletonLine className="h-3.5 w-3/4" />
          </div>
        </div>
        <div className="mt-4 border-t border-canvas-silk pt-4 dark:border-slate-800">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Order card — mirrors the Marketplace orders list item: order title +
 * status pill, total/date line, delivery address, tracking strip. */
export function SkeletonOrderCard() {
  return (
    <div
      aria-hidden
      className="rounded-xl border border-canvas-silk bg-canvas p-4 dark:border-slate-800"
    >
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SkeletonLine className="h-3.5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonLine className="mt-1.5 h-3 w-44 max-w-full" />
          <SkeletonLine className="mt-1.5 h-3 w-52 max-w-full" />
        </div>
        <Skeleton className="h-11 w-24 shrink-0 rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-8 w-full rounded-lg" />
    </div>
  );
}

/* ─── App shell chrome: header + bottom nav twins ───
 *
 * The full-page loading gate (LoadingScreen) replaces the whole shell,
 * MobileLayout included, so the frame must carry the header itself.
 * These twins mirror BOTH real headers element for element:
 *  - desktop (>1024px, where useDeviceType reports isDesktop):
 *    DesktopNav — sticky bar, AppLogo (32px mark + wordmark), the
 *    pill nav container with icon+label items, then the right cluster
 *    (search, currency, theme, bell, avatar — or Sign In / Get Started
 *    when signed out);
 *  - mobile/tablet (≤1024px): the fixed Header — logo (wordmark hides
 *    below 420px), institution switcher, search, bell, currency,
 *    theme, language, avatar/menu — plus the floating BottomNav pill
 *    (signed-in only, exactly like MobileLayout).
 * Breakpoint note: the real switch is a JS width check (>1024), so the
 * twins switch on the matching min-[1025px] media query instead of
 * Tailwind's lg (1024px) to land on the same side of the line.
 */

export type SkeletonChromeVariant = "authed" | "guest";

/** AppLogo size="sm" twin: 32px mark + "Doc' O Clock" wordmark bar. */
function SkeletonLogoMark({ wordmarkClassName }: { wordmarkClassName?: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <SkeletonLine className={cn("h-5 w-[104px]", wordmarkClassName)} />
    </div>
  );
}

function SkeletonDesktopHeader({ variant }: { variant: SkeletonChromeVariant }) {
  // Label widths approximate the real role nav items (patient set /
  // signed-out set); every role's bar has the same container geometry.
  const navLabelWidths =
    variant === "authed"
      ? ["w-[74px]", "w-[82px]", "w-[112px]", "w-[66px]"]
      : ["w-[38px]", "w-[84px]", "w-[88px]", "w-[92px]", "w-[76px]"];
  return (
    <div className="sticky top-0 z-50 hidden border-b border-canvas-silk bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 min-[1025px]:block">
      <div className="mx-auto flex h-16 min-w-0 max-w-content items-center justify-between px-4 md:px-6 lg:h-[4.25rem] lg:px-8 xl:px-12">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <SkeletonLogoMark />
          {/* Pill nav container — same border/fill/padding as DesktopNav */}
          <div className="hidden items-center gap-0.5 rounded-nav border border-canvas-silk bg-canvas-mist/60 p-1 dark:border-slate-700 dark:bg-slate-800/50 md:flex">
            {navLabelWidths.map((w, i) => (
              <div key={i} className="flex shrink-0 items-center gap-2 px-3 py-2 lg:px-4">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <SkeletonLine className={cn("h-3.5", w)} />
              </div>
            ))}
            {variant === "authed" && (
              <Skeleton className="mx-0.5 h-9 w-[76px] shrink-0 rounded-nav" />
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          {/* Search icon button (collapsible search, desktop only) */}
          <Skeleton className="hidden h-10 w-10 rounded-pill md:block" />
          <Skeleton className="h-8 w-[52px] rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          {variant === "authed" ? (
            <>
              <SkeletonCircle className="h-9 w-9" />
              <SkeletonCircle className="h-9 w-9" />
            </>
          ) : (
            <>
              <Skeleton className="hidden h-10 w-[88px] rounded-pill sm:block lg:h-11" />
              <Skeleton className="h-10 w-[118px] rounded-pill lg:h-11" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonMobileHeader({ variant }: { variant: SkeletonChromeVariant }) {
  return (
    <div className="border-b border-canvas-silk bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 min-[1025px]:hidden">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4">
        {/* Real mobile Header: wordmark hides below 420px */}
        <SkeletonLogoMark wordmarkClassName="hidden min-[420px]:block" />
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {variant === "authed" && (
            <>
              {/* InstitutionSwitcher: icon-only on xs, labelled from sm */}
              <Skeleton className="h-9 w-10 rounded-pill sm:w-[76px]" />
              <Skeleton className="h-9 w-9 rounded-pill sm:h-10 sm:w-10" />
              <Skeleton className="h-9 w-9 rounded-pill sm:h-10 sm:w-10" />
            </>
          )}
          <Skeleton className="hidden h-8 w-[46px] rounded-md min-[420px]:block" />
          <Skeleton className="h-9 w-9 rounded-md" />
          {/* Language select (compact twin; the real trigger is a wide
              select that crowds the xs bar, so it joins from 560px) */}
          <Skeleton className="hidden h-9 w-[52px] rounded-md min-[560px]:block" />
          {variant === "authed" ? (
            <SkeletonCircle className="ml-1 h-8 w-8 sm:h-9 sm:w-9" />
          ) : (
            <Skeleton className="ml-1 h-9 w-9 rounded-pill sm:h-10 sm:w-10" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Header twin for the active shell (desktop bar or mobile bar). */
export function SkeletonHeaderBar({
  variant = "authed",
}: {
  variant?: SkeletonChromeVariant;
}) {
  return (
    <>
      <SkeletonDesktopHeader variant={variant} />
      <SkeletonMobileHeader variant={variant} />
    </>
  );
}

/**
 * BottomNav twin — the floating pill bar MobileLayout renders for
 * signed-in users on mobile/tablet: five icon+label slots (labels
 * join at 400px, exactly like BottomNavItem).
 */
export function SkeletonBottomNav() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 min-[1025px]:hidden"
    >
      <div className="relative mx-auto mb-3 max-w-md px-4">
        <div className="flex items-center justify-evenly rounded-pill border border-canvas-silk bg-white/95 px-2 py-1.5 shadow-pill-nav backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex min-h-[50px] min-w-0 flex-1 flex-col items-center justify-center px-2 py-1.5"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <SkeletonLine className="mt-1 hidden h-2.5 w-10 min-[400px]:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Whole-app frame for route/auth loading (used by LoadingScreen):
 * the shell's header twin + page body skeleton + (signed-in) bottom
 * nav twin, instead of a centred spinner — the layout the user is
 * about to see, header included, is already on screen.
 */
export function SkeletonAppFrame({
  variant = "authed",
}: {
  variant?: SkeletonChromeVariant;
}) {
  return (
    <div aria-hidden className="flex min-h-full w-full flex-col">
      <SkeletonHeaderBar variant={variant} />
      <div className="mx-auto w-full max-w-[1800px] flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-12">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-64 max-w-full" />
          <SkeletonLine className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonStatGrid />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SkeletonCard className="h-56 lg:col-span-2" />
          <SkeletonCard className="h-56" />
        </div>
        <div className="divide-y divide-canvas-silk rounded-2xl border border-canvas-silk bg-white px-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {[0, 1, 2].map((i) => (
            <SkeletonListRow key={i} action />
          ))}
        </div>
      </div>
      {variant === "authed" && <SkeletonBottomNav />}
    </div>
  );
}
