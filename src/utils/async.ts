/**
 * Async safety helpers — in healthcare software a hanging request is a
 * denial of care. Every remote call on a critical path must have a
 * timeout so the UI can degrade (cached data, retry UI) instead of
 * spinning forever on a flaky ward network.
 */

export class TimeoutError extends Error {
  constructor(
    message = 'Request timed out',
    public timeoutMs = 0
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Race a promise against a timeout. Rejects with TimeoutError so callers
 * can distinguish "slow network" from real failures and retry.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label = 'request'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new TimeoutError(`${label} timed out after ${timeoutMs}ms`, timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Default budgets per criticality tier. */
export const TIMEOUTS = {
  /** Auth / roles / route gates — must resolve fast or release the UI. */
  critical: 8000,
  /** Standard lists, dashboards, directories. */
  standard: 12000,
  /** Heavy reports, exports, media uploads. */
  heavy: 30000,
} as const;
