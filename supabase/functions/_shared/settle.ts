// Shared settlement helper.
//
// Once a gateway (Broadpay/Lenco, PayPal, ...) confirms that money was actually
// received, this module books the money into the platform ledger:
//   * creates/locates the canonical `payments` row,
//   * resolves the single payee (institution, provider or pharmacy),
//   * calls `process_payment_with_splits` so the platform fee lands in the
//     app owner wallet and the remainder in the payee's wallet,
//   * or credits the payer's own wallet for a top-up.
//
// It is idempotent: settling the same external reference twice is a no-op.

type Admin = {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export interface SettleInput {
  gateway: 'broadpay' | 'lenco' | 'paypal' | 'mobile_money' | 'wallet';
  /** Gateway-side unique id (trans token, capture id, ...). Used for idempotency. */
  externalRef: string;
  payerId: string;
  amount: number;
  currency?: string;
  referenceType: string;
  referenceId?: string | null;
  description?: string;
}

export interface SettleResult {
  settled: boolean;
  already?: boolean;
  paymentId?: string | null;
  payeeType?: string | null;
  payeeId?: string | null;
  platformFee?: number | null;
  payeeAmount?: number | null;
  reason?: string;
}

interface Payee {
  providerId: string | null;
  institutionId: string | null;
  paymentType: 'consultation' | 'pharmacy';
  serviceId?: string | null;
}

const WALLET_TOPUP_TYPES = new Set(['wallet_topup', 'topup']);
const PLATFORM_ONLY_TYPES = new Set(['subscription', 'plan', 'listing_fee', 'hms_fee']);
const ORDER_TYPES = new Set(['order', 'pharmacy_sale']);

/**
 * A paid pharmacy order must leave 'pending': the pharmacy only prepares
 * confirmed orders, and a still-pending order stays payable — the patient
 * could be charged twice for the same order (payments audit 2026-11-24:
 * the wallet path confirmed the order in-function, the gateway settle path
 * never did). Guarded on status='pending' so it is idempotent and never
 * overrides a later fulfilment state.
 */
async function markOrderConfirmed(admin: Admin, referenceId: string | null | undefined): Promise<void> {
  if (!referenceId) return;
  const { error } = await admin
    .from('orders')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', referenceId)
    .eq('status', 'pending');
  if (error) console.error('settlePayment: order confirm failed', error);
}

/**
 * Activate a subscription whose payment just settled, server-side. The
 * pricing page used to flip the row active from the browser after payment;
 * if the user closed the tab first, they had paid for a plan that never
 * activated (payments audit 2026-11-24). Idempotent: only pending/trialing
 * rows transition.
 */
async function activateSubscription(admin: Admin, referenceId: string | null | undefined): Promise<void> {
  if (!referenceId) return;
  const { error } = await admin
    .from('user_subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', referenceId)
    .in('status', ['pending', 'trialing']);
  if (error) console.error('settlePayment: subscription activation failed', error);
}

async function resolvePayee(
  admin: Admin,
  referenceType: string,
  referenceId: string | null | undefined,
): Promise<Payee | null> {
  const type = (referenceType || '').toLowerCase();
  if (!referenceId) return null;

  if (type === 'order' || type === 'pharmacy_sale') {
    const { data } = await admin.from('orders').select('pharmacy_id').eq('id', referenceId).maybeSingle();
    if (!data?.pharmacy_id) return null;
    // A pharmacy is registered as a healthcare institution when it is a
    // facility, otherwise the pharmacy owner is a user.
    const { data: inst } = await admin
      .from('healthcare_institutions')
      .select('id')
      .eq('id', data.pharmacy_id)
      .maybeSingle();
    return inst
      ? { providerId: null, institutionId: inst.id, paymentType: 'pharmacy' }
      : { providerId: data.pharmacy_id, institutionId: null, paymentType: 'pharmacy' };
  }

  if (type === 'booking_fee') {
    const { data } = await admin
      .from('booking_fees')
      .select('provider_id, appointment_id')
      .eq('id', referenceId)
      .maybeSingle();
    let institutionId: string | null = null;
    if (data?.appointment_id) {
      const { data: appt } = await admin
        .from('appointments')
        .select('institution_id, provider_id')
        .eq('id', data.appointment_id)
        .maybeSingle();
      institutionId = appt?.institution_id ?? null;
      if (!data.provider_id && appt?.provider_id) data.provider_id = appt.provider_id;
    }
    if (!data?.provider_id && !institutionId) return null;
    return { providerId: data?.provider_id ?? null, institutionId, paymentType: 'consultation' };
  }

  if (type === 'appointment') {
    const { data } = await admin
      .from('appointments')
      .select('provider_id, institution_id')
      .eq('id', referenceId)
      .maybeSingle();
    if (!data) return null;
    return { providerId: data.provider_id, institutionId: data.institution_id ?? null, paymentType: 'consultation' };
  }

  if (type === 'consultation') {
    const { data } = await admin
      .from('video_consultations')
      .select('provider_id')
      .eq('id', referenceId)
      .maybeSingle();
    if (!data?.provider_id) return null;
    return { providerId: data.provider_id, institutionId: null, paymentType: 'consultation' };
  }

  if (type === 'invoice') {
    const { data } = await admin
      .from('billing_invoices')
      .select('institution_id')
      .eq('id', referenceId)
      .maybeSingle();
    if (!data?.institution_id) return null;
    return { providerId: null, institutionId: data.institution_id, paymentType: 'consultation' };
  }

  if (type === 'healthcare_service') {
    const { data } = await admin
      .from('healthcare_services')
      .select('provider_id')
      .eq('id', referenceId)
      .maybeSingle();
    if (!data?.provider_id) return null;
    return {
      providerId: data.provider_id,
      institutionId: null,
      paymentType: 'consultation',
      serviceId: referenceId,
    };
  }

  return null;
}

/**
 * Resolve the profile id the canonical `payments` row must carry as
 * `provider_id`.
 *
 * BUG (live-proven 2026-11-16, docswarm billing): for institution payees
 * (invoice, facility pharmacy sale) `payee.providerId` is null, so the old
 * code stored the INSTITUTION id there — `payments.provider_id` FKs to
 * `profiles(id)`, the insert failed with 23503, settlement returned
 * `payment_row_failed`, and a collected Lenco payment was left in limbo:
 * `lenco_payments` said 'paid', the user was told their wallet was
 * credited, but no wallet was credited and the invoice stayed unpaid.
 * The institution's admin is a real profile and the accountable human for
 * the facility's money, so they are the representative payee here. The
 * split itself keys off `p_institution_id`, not this id.
 * Returns null when neither a provider nor an institution admin resolves —
 * callers must fail closed, never insert a non-profile id.
 */
async function resolvePaymentsProviderId(
  admin: Admin,
  payee: Payee,
): Promise<string | null> {
  if (payee.providerId) return payee.providerId;
  if (!payee.institutionId) return null;
  const { data } = await admin
    .from('healthcare_institutions')
    .select('admin_id')
    .eq('id', payee.institutionId)
    .maybeSingle();
  return (data as any)?.admin_id ?? null;
}

/**
 * Map a gateway name onto the billing_payments.payment_mode enum
 * (cash | card | mobile_money | insurance | bank_transfer | cheque).
 * Lenco/Broadpay collections ARE mobile money; PayPal settles as an
 * electronic bank transfer. Passing the raw gateway string ('lenco')
 * fails with 22P02 — live-proven 2026-11-16, which left a settled K10
 * invoice unbooked after the split had already credited the wallets.
 */
function toBillingPaymentMode(gateway: string): string {
  const g = (gateway || '').toLowerCase();
  if (g === 'lenco' || g === 'broadpay' || g === 'mobile_money') return 'mobile_money';
  return 'bank_transfer';
}

/**
 * Book a settled gateway payment against its `billing_invoices` row.
 * Idempotent: a `billing_payments` row keyed by the gateway reference is
 * inserted only once per invoice. The existing trigger
 * `trg_update_invoice_on_payment` then recomputes the invoice's
 * paid_amount / balance / status from the sum of its payments — so
 * replays, retries and the already-settled path can all call this safely.
 * Returns false when the booking did not land (callers must report the
 * settlement as failed, not claim the invoice is paid).
 */
async function applyInvoicePayment(
  admin: Admin,
  args: {
    institutionId: string;
    invoiceId: string;
    amount: number;
    gateway: string;
    externalRef: string;
    payerId: string;
  },
): Promise<boolean> {
  const { data: prior } = await admin
    .from('billing_payments')
    .select('id')
    .eq('invoice_id', args.invoiceId)
    .eq('reference_number', args.externalRef)
    .limit(1);
  if (prior && prior.length > 0) return true;
  const { error } = await admin.from('billing_payments').insert({
    institution_id: args.institutionId,
    invoice_id: args.invoiceId,
    amount: args.amount,
    payment_mode: toBillingPaymentMode(args.gateway),
    reference_number: args.externalRef,
    received_by: args.payerId,
    payment_date: new Date().toISOString(),
  });
  if (error) {
    console.error('applyInvoicePayment: billing_payments insert failed', error);
    return false;
  }
  return true;
}

export async function settlePayment(admin: Admin, input: SettleInput): Promise<SettleResult> {
  const {
    gateway,
    externalRef,
    payerId,
    amount,
    currency = 'ZMW',
    referenceType,
    referenceId = null,
    description,
  } = input;

  if (!externalRef || !payerId || !(amount > 0)) {
    return { settled: false, reason: 'invalid_settlement_input' };
  }

  const type = (referenceType || '').toLowerCase();

  // Idempotency guard — one settlement per gateway reference.
  const { data: existing } = await admin
    .from('payments')
    .select('id, status')
    .eq('external_payment_id', externalRef)
    .maybeSingle();

  if (existing?.status === 'completed') {
    // Self-healing for side effects added after some payments settled:
    // pharmacy orders confirm and subscriptions activate on re-verify too.
    if (ORDER_TYPES.has(type)) {
      await markOrderConfirmed(admin, referenceId);
    }
    if (type === 'subscription') {
      await activateSubscription(admin, referenceId);
    }
    // Self-healing: a payment settled before the invoice-booking step
    // existed (or interrupted between split and booking) still gets its
    // invoice marked paid — applyInvoicePayment is idempotent.
    if (type === 'invoice' && referenceId) {
      const payeeForInvoice = await resolvePayee(admin, type, referenceId);
      if (payeeForInvoice?.institutionId) {
        const booked = await applyInvoicePayment(admin, {
          institutionId: payeeForInvoice.institutionId,
          invoiceId: referenceId,
          amount,
          gateway,
          externalRef,
          payerId,
        });
        if (!booked) {
          return { settled: false, paymentId: existing.id, reason: 'invoice_booking_failed' };
        }
      }
    }
    return { settled: true, already: true, paymentId: existing.id };
  }

  // Wallet top-ups: the payer funds their own wallet, no split.
  if (WALLET_TOPUP_TYPES.has(type)) {
    // Idempotency: the gateway reference is stored in wallet_transactions.gateway_ref
    // with a partial unique index. The pre-check below is a fast path; the unique
    // constraint is the real guard — a 23505 from a concurrent settlement is treated
    // as idempotent success (same pattern as the payments path above).
    const refTag = `${gateway.toUpperCase()}:${externalRef}`;
    const { data: priorCredit } = await admin
      .from('wallet_transactions')
      .select('id')
      .eq('gateway_ref', refTag)
      .limit(1);
    if (priorCredit && priorCredit.length > 0) {
      return { settled: true, already: true };
    }
    const { error } = await admin.rpc('process_wallet_transaction', {
      p_user_id: payerId,
      p_transaction_type: 'credit',
      p_amount: amount,
      p_description: description ? `${description} [${refTag}]` : `${gateway.toUpperCase()} wallet top-up [${refTag}]`,
      p_payment_id: null,
      p_gateway_ref: refTag,
    });
    if (error) {
      // Unique violation on gateway_ref means a concurrent settlement already
      // credited this reference — treat as idempotent success.
      const isUniqueViolation = (error as any)?.code === '23505' ||
        String((error as any)?.message || '').includes('uq_wallet_transactions_gateway_ref');
      if (isUniqueViolation) {
        return { settled: true, already: true };
      }
      console.error('settlePayment wallet credit failed', error);
      return { settled: false, reason: 'wallet_credit_failed' };
    }
    return { settled: true, payeeType: 'wallet', payeeId: payerId, payeeAmount: amount };
  }

  const payee = await resolvePayee(admin, type, referenceId);

  // ── PAYMENT MODE GATE ──────────────────────────────────────────────
  // If the payee institution is in 'own' (HMS-only) mode, Doc'O Clock must
  // NEVER touch their money: no splits, no platform fee, no wallet credits.
  // This is the single choke point covering Lenco verify + webhook.
  if (payee?.institutionId) {
    const { data: inst } = await admin
      .from("healthcare_institutions")
      .select("payment_mode")
      .eq("id", payee.institutionId)
      .maybeSingle();
    if (inst?.payment_mode === "own") {
      console.log(`settlePayment: skipping — institution ${payee.institutionId} is in 'own' mode`);
      return { settled: false, reason: "own_mode_skip" };
    }
  }

  // Platform-only revenue (subscriptions, HMS fees): all of it goes to the
  // app owner wallet, there is no second party.
  //
  // L-5 (security sweep 2026-11-10): this used to be a read-modify-write
  // done here (SELECT balance, UPDATE balance = old + amount), so
  // concurrent settlements could lose a credit. It now routes through
  // the locking settle_platform_revenue RPC: the wallet row is locked
  // FOR UPDATE, the credit is recorded in app_owner_wallet_credits
  // (external_ref UNIQUE = idempotency key), and the balance moves with
  // one atomic increment — the same pattern as process_wallet_transaction
  // for user wallets. Note process_wallet_transaction itself cannot be
  // used here: it credits user_wallets by user id, and the app owner
  // wallet is a separate table with no user id.
  if (!payee) {
    if (PLATFORM_ONLY_TYPES.has(type)) {
      const { data: credit, error: creditErr } = await admin.rpc('settle_platform_revenue', {
        p_amount: amount,
        p_external_ref: externalRef,
        p_gateway: gateway,
        p_payer_id: payerId,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_description: description ?? null,
        p_currency: currency,
      });
      if (creditErr) {
        console.error('settlePayment platform credit failed', creditErr);
        return { settled: false, reason: 'platform_credit_failed' };
      }
      if (!credit?.settled) {
        console.error('settlePayment platform credit refused', credit);
        return { settled: false, reason: (credit?.reason as string) || 'platform_credit_failed' };
      }
      // The money is in — activate the subscription server-side so the
      // plan is live even if the payer never returns to the pricing page.
      if (type === 'subscription') {
        await activateSubscription(admin, referenceId);
      }
      return {
        settled: true,
        already: (credit as any)?.already === true,
        payeeType: 'app_owner',
        payeeAmount: amount,
        platformFee: amount,
      };
    }
    console.warn('settlePayment: no payee resolved', { referenceType, referenceId });
    return { settled: false, reason: 'payee_unresolved' };
  }

  // The payments row is the anchor for splits and refunds. Its
  // provider_id must be a real profile (FK to profiles) — for institution
  // payees that is the institution's admin, never the institution id.
  const paymentsProviderId = await resolvePaymentsProviderId(admin, payee);
  if (!paymentsProviderId) {
    console.error('settlePayment: no profile resolves as payments provider', { referenceType, referenceId });
    return { settled: false, reason: 'payee_admin_unresolved' };
  }

  let paymentId = existing?.id as string | undefined;
  if (!paymentId) {
    const { data: created, error: insErr } = await admin
      .from('payments')
      .insert({
        patient_id: payerId,
        provider_id: paymentsProviderId,
        service_id: payee.serviceId ?? null,
        amount,
        currency,
        status: 'completed',
        payment_method: gateway,
        payment_date: new Date().toISOString(),
        external_payment_id: externalRef,
        invoice_number: `${gateway.toUpperCase()}-${Date.now()}`,
        metadata: { reference_type: referenceType, reference_id: referenceId, description },
      })
      .select('id')
      .single();
    if (insErr || !created) {
      // Unique violation on external_payment_id means a concurrent settlement
      // already created the row — treat as idempotent success.
      const isUniqueViolation = (insErr as any)?.code === '23505' ||
        String((insErr as any)?.message || '').includes('uq_payments_external_payment_id');
      if (isUniqueViolation) {
        const { data: raced } = await admin
          .from('payments')
          .select('id, status')
          .eq('external_payment_id', externalRef)
          .maybeSingle();
        if (raced) {
          if (type === 'invoice' && referenceId && payee.institutionId) {
            const booked = await applyInvoicePayment(admin, {
              institutionId: payee.institutionId,
              invoiceId: referenceId,
              amount,
              gateway,
              externalRef,
              payerId,
            });
            if (!booked) {
              return { settled: false, paymentId: raced.id, reason: 'invoice_booking_failed' };
            }
          }
          return { settled: true, already: true, paymentId: raced.id };
        }
      }
      console.error('settlePayment could not create payment row', insErr);
      return { settled: false, reason: 'payment_row_failed' };
    }
    paymentId = created.id;
  } else {
    await admin
      .from('payments')
      .update({ status: 'completed', payment_date: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', paymentId);
  }

  const { data: split, error: splitErr } = await admin.rpc('process_payment_with_splits', {
    p_payment_id: paymentId,
    p_total_amount: amount,
    // Same resolved profile as the payments row: the split RPC inserts a
    // 'health_personnel' payment_splits row with this id (recipient_id is
    // NOT NULL), so a null provider id would fail the split for every
    // institution payee. The amount routed to personnel is 0 when an
    // institution is set, so this is bookkeeping only.
    p_provider_id: paymentsProviderId,
    p_institution_id: payee.institutionId,
    p_payment_type: payee.paymentType,
  });

  if (splitErr) {
    console.error('settlePayment split failed', splitErr);
    return { settled: false, paymentId, reason: 'split_failed' };
  }

  // Book the money against the invoice it was collected for, so the
  // invoice actually closes instead of staying 'sent' with its balance.
  // A booking failure is reported as a failed settlement (never as a
  // success): the wallets already hold the split, and the next verify
  // retries the booking through the already-settled path.
  if (type === 'invoice' && referenceId && payee.institutionId) {
    const booked = await applyInvoicePayment(admin, {
      institutionId: payee.institutionId,
      invoiceId: referenceId,
      amount,
      gateway,
      externalRef,
      payerId,
    });
    if (!booked) {
      return { settled: false, paymentId, reason: 'invoice_booking_failed' };
    }
  }

  // A paid pharmacy order leaves 'pending' (fulfilment + double-pay guard).
  if (ORDER_TYPES.has(type)) {
    await markOrderConfirmed(admin, referenceId);
  }

  // The split RPC returns app_amount / institution_amount /
  // personnel_amount / pharmacy_amount — map those real fields (the old
  // platform_fee / payee_amount keys never existed, so verify responses
  // always carried nulls).
  const payeeAmount =
    Number(split?.institution_amount ?? 0) +
    Number(split?.personnel_amount ?? 0) +
    Number(split?.pharmacy_amount ?? 0);
  return {
    settled: true,
    paymentId,
    payeeType: payee.institutionId ? 'institution' : 'provider',
    payeeId: payee.institutionId ?? payee.providerId ?? null,
    platformFee: split?.app_amount ?? null,
    payeeAmount: split ? payeeAmount : null,
  };
}
