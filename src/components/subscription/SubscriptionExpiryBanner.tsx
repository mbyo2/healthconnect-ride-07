import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SubscriptionGateState } from "@/services/subscriptionStatus";

/**
 * Renewal notice for the institution dashboard.
 *
 * Shown only when the institution's subscription is EFFECTIVELY
 * expired or past due (stored status corrected by the period end date
 * — see subscriptionStatus.ts). Institutions with no subscription
 * row, a free plan, or a live trial never see it: there are no paying
 * customers yet and free/trial terms must never be blocked or nagged
 * as if they were lapsed paid accounts.
 */
export function SubscriptionExpiryBanner({
  gate,
  isAdmin,
}: {
  gate: SubscriptionGateState | null;
  /** Only institution admins can act on billing; staff see the notice without the action. */
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();

  if (!gate) return null;
  const { effectiveStatus } = gate;
  if (effectiveStatus !== "expired" && effectiveStatus !== "past_due") return null;

  const endedOn = gate.periodEnd
    ? new Date(gate.periodEnd).toLocaleDateString("en-ZM", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const planLabel = gate.planName ? `Your ${gate.planName} subscription` : "Your subscription";
  const headline =
    effectiveStatus === "past_due"
      ? `${planLabel} is past due`
      : `${planLabel} has expired`;
  const detail = gate.blocksPaidModules
    ? "Paid add-on modules are paused until you renew. Your core workspace — patients, appointments and records — stays available."
    : "Renew to keep your plan active. Your workspace stays available in the meantime.";

  return (
    <div
      role="alert"
      className="rounded-2xl border border-warning-500/40 bg-warning-50 dark:bg-amber-950/40 dark:border-amber-500/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {headline}
            {endedOn ? ` — period ended ${endedOn}` : ""}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">{detail}</p>
        </div>
      </div>
      {isAdmin && (
        <button
          onClick={() => navigate("/pricing")}
          className="vf-btn-primary text-sm shrink-0"
        >
          Renew subscription
        </button>
      )}
    </div>
  );
}
