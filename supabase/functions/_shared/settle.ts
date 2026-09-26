// Shared settlement helper.
//
// Once a gateway (DPO, PayPal, ...) confirms that money was actually
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
  gateway: 'dpo' | 'paypal' | 'mobile_money' | 'wallet';
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
    return { settled: true, already: true, paymentId: existing.id };
  }

  // Wallet top-ups: the payer funds their own wallet, no split.
  if (WALLET_TOPUP_TYPES.has(type)) {
    // Idempotency: the guard above only covers flows that write a payments
    // row. Top-ups credit the ledger directly, so check the ledger for this
    // gateway reference before crediting — concurrent verifications must not
    // double-credit. (A unique DB constraint on the reference is the complete
    // fix; this narrows the race to true simultaneity.)
    const refTag = `${gateway.toUpperCase()}:${externalRef}`;
    const { data: priorCredit } = await admin
      .from('wallet_transactions')
      .select('id')
      .eq('transaction_type', 'credit')
      .ilike('description', `%${refTag}%`)
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
    });
    if (error) {
      console.error('settlePayment wallet credit failed', error);
      return { settled: false, reason: 'wallet_credit_failed' };
    }
    return { settled: true, payeeType: 'wallet', payeeId: payerId, payeeAmount: amount };
  }

  const payee = await resolvePayee(admin, type, referenceId);

  // Platform-only revenue (subscriptions, HMS fees): all of it goes to the
  // app owner wallet, there is no second party.
  if (!payee) {
    if (PLATFORM_ONLY_TYPES.has(type)) {
      const { data: wallet } = await admin.from('app_owner_wallet').select('id, balance').limit(1).maybeSingle();
      if (wallet) {
        await admin
          .from('app_owner_wallet')
          .update({ balance: Number(wallet.balance || 0) + amount, updated_at: new Date().toISOString() })
          .eq('id', wallet.id);
      }
      return { settled: true, payeeType: 'app_owner', payeeAmount: amount, platformFee: amount };
    }
    console.warn('settlePayment: no payee resolved', { referenceType, referenceId });
    return { settled: false, reason: 'payee_unresolved' };
  }

  // The payments row is the anchor for splits and refunds.
  let paymentId = existing?.id as string | undefined;
  if (!paymentId) {
    const { data: created, error: insErr } = await admin
      .from('payments')
      .insert({
        patient_id: payerId,
        provider_id: payee.providerId ?? payee.institutionId,
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
    p_provider_id: payee.providerId,
    p_institution_id: payee.institutionId,
    p_payment_type: payee.paymentType,
  });

  if (splitErr) {
    console.error('settlePayment split failed', splitErr);
    return { settled: false, paymentId, reason: 'split_failed' };
  }

  return {
    settled: true,
    paymentId,
    payeeType: split?.payee_type ?? null,
    payeeId: split?.payee_id ?? null,
    platformFee: split?.platform_fee ?? null,
    payeeAmount: split?.payee_amount ?? null,
  };
}
