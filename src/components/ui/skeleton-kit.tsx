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

/** Search/directory result — mirrors the ProviderList card. */
export function SkeletonProviderCard() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-canvas-silk bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-4 w-1/2" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mb-3 space-y-2">
        <SkeletonLine className="h-3.5 w-full" />
        <SkeletonLine className="h-3.5 w-4/5" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <SkeletonLine className="h-3.5 w-32" />
        <Skeleton className="h-11 w-28 rounded-pill" />
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

/**
 * Whole-app frame for route/auth loading (used by LoadingScreen):
 * header bar + page body skeleton instead of a centred spinner.
 */
export function SkeletonAppFrame() {
  return (
    <div aria-hidden className="flex min-h-full w-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-canvas-silk px-4 dark:border-slate-800 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <SkeletonLine className="h-5 w-32" />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Skeleton className="h-9 w-20 rounded-pill" />
          <Skeleton className="h-9 w-20 rounded-pill" />
          <SkeletonCircle className="h-9 w-9" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-content flex-1 space-y-6 px-4 py-6 sm:px-6">
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
    </div>
  );
}
