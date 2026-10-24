import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { evaluateCapture } from '../_shared/paypal-capture-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const captureRequestSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID required').max(100),
  paypalOrderId: z.string().min(1, 'PayPal order ID required').max(100)
});

interface PayPalCaptureRequest {
  paymentId: string;
  paypalOrderId: string;
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Validate input
    const requestData = await req.json();
    const validationResult = captureRequestSchema.safeParse(requestData);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { paymentId, paypalOrderId } = validationResult.data;

    // Get payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    // Ownership check — only the paying patient may capture their payment
    if (payment.patient_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the PayPal order ID matches the one stored on the payment record
    // (external_payment_id, set at order creation). Prevents capturing a
    // cheaper order against a different (more expensive) payment.
    if (!payment.external_payment_id || payment.external_payment_id !== paypalOrderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    if (payment.status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already completed',
          paymentId: payment.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get PayPal credentials
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const paypalBaseUrl = Deno.env.get('PAYPAL_BASE_URL') || Deno.env.get('PAYPAL_API_BASE') || 'https://api-m.paypal.com';

    if (!paypalClientId || !paypalClientSecret) {
      console.error('PayPal credentials missing at capture time — refusing to complete payment');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment provider is not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Get PayPal access token
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        throw new Error(`PayPal token request failed: ${tokenResponse.statusText}`);
      }

      const tokenData: PayPalAccessTokenResponse = await tokenResponse.json();

      // Capture the PayPal order
      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();
        console.error('PayPal capture failed:', captureResponse.status, errorText);
        throw new Error('Payment capture failed');
      }

      const captureData: PayPalCaptureResponse = await captureResponse.json();

      // Check if capture was successful
      const capture = captureData.purchase_units[0]?.payments?.captures?.[0];
      if (!capture || capture.status !== 'COMPLETED') {
        throw new Error(`PayPal capture not completed. Status: ${capture?.status}`);
      }

      const existingMetadata =
        payment.metadata && typeof payment.metadata === 'object'
          ? (payment.metadata as Record<string, unknown>)
          : {};

      // ── P2-22: never settle on status alone ──────────────────────────
      // Compare what PayPal actually captured against what this ledger row
      // says was owed (gateway_amount/gateway_currency from order creation
      // when present, else the ledger amount/currency). Currency mismatch
      // refuses settlement; an under-capture settles the lesser amount
      // only; an over-capture never settles more than the ledger amount.
      const decision = evaluateCapture({
        ledgerAmount: Number(payment.amount),
        ledgerCurrency: String(payment.currency || ''),
        gatewayAmount:
          existingMetadata.gateway_amount !== undefined
            ? Number(existingMetadata.gateway_amount)
            : null,
        gatewayCurrency:
          typeof existingMetadata.gateway_currency === 'string'
            ? existingMetadata.gateway_currency
            : null,
        capturedAmount: Number(capture.amount.value),
        capturedCurrency: capture.amount.currency_code,
      });

      if (decision.mismatch) {
        // Alert for manual reconciliation (same audit pattern as
        // send-email-campaign's security_audit_log rows). Best-effort:
        // a failed alert write must not change the settlement decision.
        const { error: auditErr } = await supabaseClient
          .from('security_audit_log')
          .insert({
            user_id: payment.patient_id,
            event_type: 'paypal_capture_mismatch',
            event_data: {
              payment_id: payment.id,
              paypal_order_id: paypalOrderId,
              paypal_capture_id: capture.id,
              decision: decision.action,
              settle_amount: decision.settleAmount,
              ...decision.mismatch,
            },
          });
        if (auditErr) {
          console.error('Failed to record capture mismatch alert:', auditErr);
        }
        console.error('PayPal capture mismatch:', {
          paymentId: payment.id,
          ...decision.mismatch,
          decision: decision.action,
        });
      }

      if (decision.action === 'refuse') {
        // Fail closed: PayPal holds captured funds but the platform ledger
        // does NOT settle. The row stays non-completed with the mismatch
        // recorded so finance can reconcile/refund manually.
        await supabaseClient
          .from('payments')
          .update({
            updated_at: new Date().toISOString(),
            error_message: `PayPal capture mismatch (${decision.mismatch.kind}): captured ${capture.amount.value} ${capture.amount.currency_code}, expected ${decision.mismatch.expectedGatewayAmount} ${decision.mismatch.expectedGatewayCurrency}. Settlement held for review.`,
            metadata: {
              ...existingMetadata,
              paypal_capture_id: capture.id,
              paypal_capture_status: capture.status,
              captured_amount: capture.amount.value,
              captured_currency: capture.amount.currency_code,
              captured_at: new Date().toISOString(),
              capture_mismatch: decision.mismatch,
              settlement_held: true,
            },
          })
          .eq('id', paymentId);

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Captured amount does not match the payment amount — settlement held for review',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const settleAmount = decision.settleAmount;

      // Update payment record
      await supabaseClient
        .from('payments')
        .update({
          status: 'completed',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          external_payment_id: capture.id,
          metadata: {
            ...existingMetadata,
            paypal_capture_id: capture.id,
            paypal_capture_status: capture.status,
            captured_amount: capture.amount.value,
            captured_currency: capture.amount.currency_code,
            captured_at: new Date().toISOString(),
            settled_amount: settleAmount,
            ...(decision.mismatch
              ? { capture_mismatch: decision.mismatch, partial_settlement: decision.action === 'settle_partial' }
              : {})
          }
        })
        .eq('id', paymentId);

      // Process wallet credit if this was a wallet top-up
      const requestedServiceId =
        payment.metadata && typeof payment.metadata === 'object'
          ? (payment.metadata as any).requested_service_id
          : null;

      if (requestedServiceId === 'wallet_topup') {
        // Idempotency: skip when this payment already produced its credit
        // (concurrent/retried captures must not double-fund the wallet).
        const { data: existingCredit } = await supabaseClient
          .from('wallet_transactions')
          .select('id')
          .eq('payment_id', payment.id)
          .eq('transaction_type', 'credit')
          .limit(1)
          .maybeSingle();
        if (!existingCredit) {
          const { error: walletError } = await supabaseClient.rpc('process_wallet_transaction', {
            p_user_id: payment.patient_id,
            p_transaction_type: 'credit',
            p_amount: settleAmount,
            p_description: `PayPal wallet top-up - ${payment.invoice_number}`,
            p_payment_id: payment.id
          });

          if (walletError) {
            console.error('Error crediting wallet:', walletError);
          }
        }
      } else {
        // Real money received: pay out the provider / pharmacy / institution
        // share and the platform fee. Idempotent via payment_splits.
        const { data: existingSplits } = await supabaseClient
          .from('payment_splits')
          .select('id')
          .eq('payment_id', payment.id)
          .limit(1);

        if (!existingSplits || existingSplits.length === 0) {
          const { data: institution } = await supabaseClient
            .from('healthcare_institutions')
            .select('id, type, payment_mode')
            .eq('id', payment.provider_id)
            .maybeSingle();

          // ── PAYMENT MODE GATE ──
          // Never split platform money to an 'own'-mode institution.
          if ((institution as any)?.payment_mode === 'own') {
            console.log(`PayPal capture: skipping splits — institution ${institution.id} is in 'own' mode`);
          } else {
            const isPharmacy =
              (institution?.type || '').toLowerCase().includes('pharmac') ||
              (payment.metadata as any)?.reference_type === 'order' ||
              (payment.metadata as any)?.reference_type === 'pharmacy_sale';

            const { error: splitError } = await supabaseClient.rpc('process_payment_with_splits', {
              p_payment_id: payment.id,
              p_total_amount: settleAmount,
              p_provider_id: institution ? null : payment.provider_id,
              p_institution_id: institution ? institution.id : null,
              p_payment_type: isPharmacy ? 'pharmacy' : 'consultation'
            });

            if (splitError) {
              console.error('Error settling payment splits:', splitError);
            }
          }
        }
      }

      console.log('PayPal payment captured successfully:', {
        paymentId: payment.id,
        captureId: capture.id,
        amount: capture.amount.value,
        currency: capture.amount.currency_code
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment captured successfully',
          paymentId: payment.id,
          captureId: capture.id,
          amount: capture.amount.value,
          currency: capture.amount.currency_code,
          settledAmount: settleAmount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (paypalError: unknown) {
      console.error('PayPal capture error:', paypalError);
      const internalMessage = paypalError instanceof Error ? paypalError.message : 'Unknown PayPal error';

      await supabaseClient
        .from('payments')
        .update({
          status: 'failed',
          error_message: internalMessage,
          failed_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      throw new Error('Payment capture failed');
    }

  } catch (error: unknown) {
    console.error('Error capturing PayPal payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Payment capture failed',
        message: 'Failed to capture PayPal payment'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
