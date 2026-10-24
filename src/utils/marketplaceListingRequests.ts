// @ts-nocheck -- loose Supabase typings, following the local style used by
// the payment-mode request code in InstitutionSettings.
/**
 * Marketplace-listing change requests.
 *
 * Listing (healthcare_institutions.list_in_marketplace) is platform-
 * governed, exactly like payment_mode: the DB trust guard refuses direct
 * changes by institution callers, so an institution REQUESTS a change
 * and a platform admin approves it (see MarketplaceListingApprovals).
 *
 * Requests are security_audit_log rows with event_type
 * 'marketplace_listing_requested'; a request is pending until a decision
 * row exists (event_type 'marketplace_listing_decided',
 * event_data.request_log_id = request id). This mirrors the payment-mode
 * request shape in InstitutionSettings / PaymentModeApprovals exactly.
 */
import { supabase } from "@/integrations/supabase/client";

export type PendingListingRequest = {
  to_listed: boolean;
  created_at: string;
};

export type ListingDecision = {
  decision: "approved" | "denied" | string;
  to_listed: boolean | null;
  created_at: string;
};

/** File a marketplace-listing change request for admin review. Throws on error. */
export async function requestMarketplaceListingChange({
  institutionId,
  institutionName,
  fromListed,
  toListed,
}: {
  institutionId: string;
  institutionName?: string | null;
  fromListed: boolean;
  toListed: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("security_audit_log").insert({
    event_type: "marketplace_listing_requested",
    user_id: user?.id,
    event_data: {
      institution_id: institutionId,
      institution_name: institutionName ?? null,
      from_listed: fromListed,
      to_listed: toListed,
      requested_by: user?.id,
    },
  });
  if (error) throw error;
}

/**
 * The latest listing request for an institution that no admin has decided
 * yet, or null. Mirrors the payment-mode pending logic in
 * InstitutionSettings.
 */
export async function fetchPendingListingRequest(
  institutionId: string
): Promise<PendingListingRequest | null> {
  const [{ data: reqs }, { data: decs }] = await Promise.all([
    supabase
      .from("security_audit_log")
      .select("id, created_at, event_data")
      .eq("event_type", "marketplace_listing_requested")
      .filter("event_data->>institution_id", "eq", institutionId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("security_audit_log")
      .select("event_data")
      .eq("event_type", "marketplace_listing_decided")
      .filter("event_data->>institution_id", "eq", institutionId)
      .limit(100),
  ]);
  const decidedIds = new Set((decs || []).map((d: any) => d.event_data?.request_log_id));
  const pending = (reqs || []).find((r: any) => !decidedIds.has(r.id));
  if (!pending) return null;
  return {
    to_listed: !!(pending as any).event_data?.to_listed,
    created_at: (pending as any).created_at,
  };
}

/** The most recent admin decision on a listing request, or null. */
export async function fetchLatestListingDecision(
  institutionId: string
): Promise<ListingDecision | null> {
  const { data } = await supabase
    .from("security_audit_log")
    .select("created_at, event_data")
    .eq("event_type", "marketplace_listing_decided")
    .filter("event_data->>institution_id", "eq", institutionId)
    .order("created_at", { ascending: false })
    .limit(1);
  const row: any = (data || [])[0];
  if (!row) return null;
  return {
    decision: row.event_data?.decision,
    to_listed:
      row.event_data?.to_listed === undefined ? null : !!row.event_data.to_listed,
    created_at: row.created_at,
  };
}
