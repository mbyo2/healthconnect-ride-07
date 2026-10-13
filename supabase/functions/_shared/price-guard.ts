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
  // expected is intentionally never exposed to callers (prevents leaking other users' invoice totals)
  public expected: number | null = null;
  constructor(_expected?: number | null) {
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

/** Only currencies the platform prices in. Prices are stored in ZMW. */
export const PLATFORM_CURRENCY = 'ZMW';
export function assertPlatformCurrency(currency: string | null | undefined): string {
  const c = String(currency || PLATFORM_CURRENCY).toUpperCase();
  if (c !== PLATFORM_CURRENCY) throw new PriceMismatchError(null);
  return c;
}

/**
 * Ensures providerId is the owner of serviceId when the service is a
 * provider-owned healthcare_services row. Platform service codes return true.
 */
export async function providerOwnsService(
  admin: SupabaseLike, serviceId: string | null | undefined, providerId: string | null | undefined,
): Promise<boolean> {
  if (!serviceId) return true;
  const { data, error } = await admin.rpc('resolve_service_provider', { _service_id: String(serviceId) });
  if (error) return false;
  if (!data) return true; // not a provider-owned service row
  return String(data) === String(providerId);
}
