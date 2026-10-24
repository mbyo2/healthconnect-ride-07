// Server-side idempotency keys (P3-17).
//
// A client-generated idempotency key alone is a weak dedupe token: the
// payments table carries a GLOBAL unique index on idempotency_key and
// process_full_payment looks the key up globally, so the same client key
// replayed by a different user — or for a different payment payload —
// collides with the first settlement and is reported as "already
// processed", silently swallowing a distinct payment.
//
// The stored key is therefore derived server-side from:
//   - the authenticated user id (keys are per-user, never global),
//   - the client-supplied retry token (unchanged retry semantics), and
//   - a hash of the canonical payment payload (amount AFTER server-side
//     price resolution, provider, service, institution, type, method,
//     currency).
//
// A genuine retry (same user, same client key, same payload) derives the
// same key and dedupes exactly as before. The same client key with a
// different user or any different payload field derives a different key
// and settles independently.

export interface IdempotencyPayload {
  patientId: string;
  providerId: string;
  serviceId: string;
  institutionId: string | null;
  paymentType: string;
  paymentMethod: string;
  currency: string;
  /** Trusted (server-resolved) amount, never the raw client amount. */
  amount: number;
}

export function canonicalIdempotencyPayload(payload: IdempotencyPayload): string {
  return JSON.stringify([
    payload.patientId,
    payload.providerId,
    payload.serviceId,
    payload.institutionId ?? null,
    payload.paymentType,
    payload.paymentMethod,
    payload.currency,
    Number(payload.amount).toFixed(2),
  ]);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive the idempotency key actually stored in the payments table.
 * Returns null when the client supplied no retry token (no dedupe
 * requested — behaviour unchanged for keyless calls).
 */
export async function deriveServerIdempotencyKey(
  userId: string,
  clientKey: string | null | undefined,
  payload: IdempotencyPayload,
): Promise<string | null> {
  if (!clientKey) return null;
  const payloadHash = await sha256Hex(canonicalIdempotencyPayload(payload));
  const digest = await sha256Hex(`${userId}:${clientKey}:${payloadHash}`);
  return `srv_${digest}`;
}
