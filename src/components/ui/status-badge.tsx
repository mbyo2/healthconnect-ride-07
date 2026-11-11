import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * StatusBadge — the ONE status pill for the product interior.
 *
 * Stripe triad: pale background, darker text of the same hue, mid-tone
 * border. Tones are semantic only (neutral / info / positive / warning /
 * negative / urgent) — colour is never decorative, and the label text
 * always carries the meaning on its own (never colour alone).
 *
 * This file previously held a Supabase-fetching component with zero
 * usages; it was replaced 2026-11-11 with this pure presentational
 * primitive. Pages must use it (directly, or via `statusTone`) instead
 * of hand-rolling per-page pill maps.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral:
          "border-border bg-muted text-muted-foreground",
        info:
          "border-primary-500/30 bg-primary-500/10 text-primary-700 dark:text-primary-300",
        positive:
          "border-success-500/30 bg-success-500/10 text-success-700 dark:text-success-300",
        warning:
          "border-warning-500/30 bg-warning-500/10 text-warning-700 dark:text-warning-400",
        negative:
          "border-destructive/30 bg-destructive/10 text-destructive",
        urgent:
          "border-transparent bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>

const POSITIVE = new Set([
  "completed", "complete", "done", "approved", "verified", "active",
  "paid", "settled", "released", "dispensed", "resolved", "successful",
  "success", "filled", "ready", "delivered", "signed off",
])
const INFO = new Set([
  "scheduled", "in progress", "in_progress", "in-progress", "ongoing",
  "admitted", "checked in", "checked-in", "confirmed", "booked",
  "processing", "in transit", "in_transit", "new", "open", "assigned",
])
const WARNING = new Set([
  "pending", "awaiting", "partial", "partially filled", "waiting",
  "on hold", "on_hold", "low stock", "review", "under review",
  "rescheduled", "draft",
])
const NEGATIVE = new Set([
  "cancelled", "canceled", "rejected", "failed", "denied", "declined",
  "expired", "missed", "no-show", "no show", "error", "overdue",
])
const URGENT = new Set([
  "critical", "emergency", "urgent", "stat", "high priority",
])

/** Map any status string the app already stores to its semantic tone. */
export function statusTone(status: string): StatusTone {
  const key = status.trim().toLowerCase()
  if (URGENT.has(key)) return "urgent"
  if (POSITIVE.has(key)) return "positive"
  if (INFO.has(key)) return "info"
  if (WARNING.has(key)) return "warning"
  if (NEGATIVE.has(key)) return "negative"
  return "neutral"
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Raw status value; tone is derived with statusTone when no explicit
   *  `tone` is given, and the status text becomes the label. */
  status?: string
}

function StatusBadge({ tone, status, className, children, ...props }: StatusBadgeProps) {
  const resolved: StatusTone = tone ?? (status ? statusTone(status) : "neutral")
  return (
    <span className={cn(statusBadgeVariants({ tone: resolved }), className)} {...props}>
      {children ?? status}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
