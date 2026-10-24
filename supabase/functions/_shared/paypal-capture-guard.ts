// PayPal capture guard (audit P2-22).
//
// capture-paypal-payment previously settled the full ledger amount whenever
// PayPal reported status === 'COMPLETED', never comparing what was actually
// captured against what the ledger row says was owed. This pure helper makes
// that comparison and decides how much may settle:
//
//   * captured currency != expected currency  -> REFUSE settlement entirely
//     (amounts in different currencies are not comparable; fail closed and
//     raise an alert for manual reconciliation).
//   * captured < expected (beyond tolerance)  -> settle the LESSER amount,
//     scaled back into ledger currency, and raise an alert.
//   * captured > expected                     -> settle the ledger amount
//     only (never credit more than was owed), and raise an alert.
//   * captured == expected (within 0.01)      -> settle the ledger amount.
//
// The "expected" gateway amount/currency come from the order-creation
// metadata (gateway_amount / gateway_currency, written by
// process-paypal-payment when it converts ZMW -> USD for the gateway);
// when absent, the ledger amount/currency themselves are the expectation
// (orders created directly in the ledger currency).

export interface CaptureGuardInput {
  /** payments.amount — what the ledger says was owed (ledger currency). */
  ledgerAmount: number;
  /** payments.currency. */
  ledgerCurrency: string;
  /** metadata.gateway_amount — amount the PayPal order was created for. */
  gatewayAmount?: number | null;
  /** metadata.gateway_currency — currency the PayPal order was created in. */
  gatewayCurrency?: string | null;
  /** capture.amount.value reported by PayPal, parsed as a number. */
  capturedAmount: number;
  /** capture.amount.currency_code reported by PayPal. */
  capturedCurrency: string;
}

export type CaptureMismatchKind =
  | 'currency_mismatch'
  | 'under_capture'
  | 'over_capture'
  | 'invalid_capture_amount';

export interface CaptureMismatch {
  kind: CaptureMismatchKind;
  expectedGatewayAmount: number;
  expectedGatewayCurrency: string;
  capturedAmount: number;
  capturedCurrency: string;
  ledgerAmount: number;
  ledgerCurrency: string;
}

export type CaptureDecision =
  | { action: 'settle'; settleAmount: number; mismatch: null }
  | { action: 'settle_partial'; settleAmount: number; mismatch: CaptureMismatch }
  | { action: 'refuse'; settleAmount: 0; mismatch: CaptureMismatch };

const TOLERANCE = 0.01;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function evaluateCapture(input: CaptureGuardInput): CaptureDecision {
  const ledgerAmount = Number(input.ledgerAmount);
  const ledgerCurrency = String(input.ledgerCurrency || '').toUpperCase();
  const expectedGatewayAmount = Number(
    input.gatewayAmount !== null && input.gatewayAmount !== undefined
      ? input.gatewayAmount
      : input.ledgerAmount,
  );
  const expectedGatewayCurrency = String(
    input.gatewayCurrency || input.ledgerCurrency || '',
  ).toUpperCase();
  const capturedAmount = Number(input.capturedAmount);
  const capturedCurrency = String(input.capturedCurrency || '').toUpperCase();

  const base = {
    expectedGatewayAmount,
    expectedGatewayCurrency,
    capturedAmount,
    capturedCurrency,
    ledgerAmount,
    ledgerCurrency,
  };

  if (
    !Number.isFinite(capturedAmount) ||
    capturedAmount <= 0 ||
    !Number.isFinite(expectedGatewayAmount) ||
    expectedGatewayAmount <= 0
  ) {
    return {
      action: 'refuse',
      settleAmount: 0,
      mismatch: { kind: 'invalid_capture_amount', ...base },
    };
  }

  if (capturedCurrency !== expectedGatewayCurrency) {
    return {
      action: 'refuse',
      settleAmount: 0,
      mismatch: { kind: 'currency_mismatch', ...base },
    };
  }

  const diff = capturedAmount - expectedGatewayAmount;

  if (Math.abs(diff) <= TOLERANCE) {
    return { action: 'settle', settleAmount: ledgerAmount, mismatch: null };
  }

  if (diff < 0) {
    // Settle the lesser only, scaled from gateway terms into ledger terms.
    const settleAmount = round2(
      (ledgerAmount * capturedAmount) / expectedGatewayAmount,
    );
    if (settleAmount <= 0) {
      return {
        action: 'refuse',
        settleAmount: 0,
        mismatch: { kind: 'under_capture', ...base },
      };
    }
    return {
      action: 'settle_partial',
      settleAmount,
      mismatch: { kind: 'under_capture', ...base },
    };
  }

  // Over-capture: never settle more than the ledger amount owed.
  return {
    action: 'settle',
    settleAmount: ledgerAmount,
    mismatch: { kind: 'over_capture', ...base },
  };
}
