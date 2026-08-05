// Server-side price integrity helpers.
// Never trust an amount supplied by the browser: resolve the authoritative
// price from the database and reject (or override) mismatching requests.

const TOLERANCE = 0.01;

type SupabaseLike = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export async function resolveServicePrice(
  admin: SupabaseLike,
  serviceId: string | null | undefined,
): Promise<number | null> {
  if (!serviceId) return null;
  const { data, error } = await admin.rpc('resolve_service_price', { _service_id: String(serviceId) });
  if (error || data === null || data === undefined) return null;
  const n = Number(data);
  return Number.isFinite(n) ? n : null;
}

export async function resolveReferenceAmount(
  admin: SupabaseLike,
  referenceType: string | null | undefined,
  referenceId: string | null | undefined,
): Promise<number | null> {
  if (!referenceType || !referenceId) return null;
  const { data, error } = await admin.rpc('resolve_payment_amount', {
    _reference_type: String(referenceType),
    _reference_id: String(referenceId),
  });
  if (error || data === null || data === undefined) return null;
  const n = Number(data);
  return Number.isFinite(n) ? n : null;
}

export function amountsMatch(clientAmount: number, trustedAmount: number): boolean {
  return Math.abs(Number(clientAmount) - Number(trustedAmount)) <= TOLERANCE;
}

/**
 * Returns the amount that must be charged, or throws a PriceMismatchError.
 * When no trusted price can be resolved the client amount is used as-is only
 * if `allowUnresolved` is true (e.g. self-funding wallet top-ups).
 */
export class PriceMismatchError extends Error {
  constructor(public expected: number | null) {
    super('Amount does not match the authoritative price for this item');
  }
}

export function assertTrustedAmount(
  clientAmount: number,
  trustedAmount: number | null,
  allowUnresolved = false,
): number {
  if (trustedAmount === null) {
    if (allowUnresolved) return clientAmount;
    throw new PriceMismatchError(null);
  }
  if (!amountsMatch(clientAmount, trustedAmount)) {
    throw new PriceMismatchError(trustedAmount);
  }
  return trustedAmount;
}
