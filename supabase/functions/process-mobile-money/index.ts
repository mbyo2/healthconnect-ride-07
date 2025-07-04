import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MobileMoneyRequest {
  amount: number;
  phoneNumber: string;
  provider: 'mtn' | 'vodacom' | 'zamtel';
  patientId: string;
  providerId?: string;
  serviceId?: string;
  orderId?: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      amount, 
      phoneNumber, 
      provider, 
      patientId, 
      providerId, 
      serviceId, 
      orderId,
      description 
    } = await req.json() as MobileMoneyRequest;

    // Validate amount (minimum 1 ZMW)
    if (amount < 1) {
      throw new Error('Minimum payment amount is K1.00');
    }

    // Format phone number for Zambian mobile money
    const formatZambianPhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, '');
      
      if (digits.startsWith('260')) {
        return digits;
      } else if (digits.startsWith('0')) {
        return '260' + digits.substring(1);
      } else if (digits.length === 9) {
        return '260' + digits;
      }
      
      return '260' + digits;
    };

    const formattedPhone = formatZambianPhone(phoneNumber);

    // Validate provider and phone number
    const validateProvider = (phone: string, provider: string): boolean => {
      const phonePrefix = phone.substring(3, 6); // Remove 260 country code
      
      switch (provider) {
        case 'mtn':
          return ['977', '966', '976'].includes(phonePrefix);
        case 'vodacom':
          return ['967', '976'].includes(phonePrefix);
        case 'zamtel':
          return ['978'].includes(phonePrefix);
        default:
          return false;
      }
    };

    if (!validateProvider(formattedPhone, provider)) {
      throw new Error(`Phone number ${phoneNumber} is not compatible with ${provider.toUpperCase()}`);
    }

    // Generate unique transaction reference
    const transactionRef = `DOC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        currency: 'ZMW',
        status: 'pending',
        payment_method: 'mobile_money',
        invoice_number: transactionRef,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create mobile money payment record
    const { data: mobilePayment, error: mobilePaymentError } = await supabaseClient
      .from('mobile_money_payments')
      .insert({
        payment_id: payment.id,
        provider: provider,
        phone_number: formattedPhone,
        amount: amount,
        transaction_reference: transactionRef,
        status: 'initiated',
        initiated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (mobilePaymentError) throw mobilePaymentError;

    // Initiate mobile money payment with provider
    const paymentResult = await initiateMobileMoneyPayment({
      amount,
      phone: formattedPhone,
      provider,
      reference: transactionRef,
      description: description || `Payment for healthcare services`
    });

    // Update mobile money payment with external transaction ID
    if (paymentResult.success) {
      await supabaseClient
        .from('mobile_money_payments')
        .update({
          external_transaction_id: paymentResult.transactionId,
          status: 'pending'
        })
        .eq('id', mobilePayment.id);
    } else {
      await supabaseClient
        .from('mobile_money_payments')
        .update({
          status: 'failed',
          failure_reason: paymentResult.error
        })
        .eq('id', mobilePayment.id);
    }

    console.log('Mobile money payment initiated:', paymentResult);

    return new Response(
      JSON.stringify({
        success: paymentResult.success,
        paymentId: payment.id,
        transactionReference: transactionRef,
        externalTransactionId: paymentResult.transactionId,
        message: paymentResult.success 
          ? `Payment request sent to ${formattedPhone}. Please check your phone and enter your ${provider.toUpperCase()} PIN to complete the payment.`
          : paymentResult.error,
        amount,
        provider: provider.toUpperCase()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing mobile money payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Initiate mobile money payment with Zambian providers
async function initiateMobileMoneyPayment({
  amount,
  phone,
  provider,
  reference,
  description
}: {
  amount: number;
  phone: string;
  provider: string;
  reference: string;
  description: string;
}) {
  try {
    // In production, integrate with actual Zambian mobile money APIs:
    // - MTN Mobile Money API
    // - Vodacom M-Pesa API
    // - Zamtel Kwacha API
    // - Flutterwave (supports Zambian mobile money)
    // - Paystack (supports Zambian mobile money)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Simulate occasional failures (10% failure rate)
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: getRandomFailureReason(provider)
      };
    }

    // Simulate successful payment initiation
    return {
      success: true,
      transactionId: `${provider.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      reference: reference,
      message: `Payment request sent to ${phone}`,
      estimatedProcessingTime: getProcessingTime(provider)
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to initiate ${provider.toUpperCase()} payment: ${error.message}`
    };
  }
}

// Get realistic failure reasons for different providers
function getRandomFailureReason(provider: string): string {
  const commonReasons = [
    'Insufficient balance in mobile money account',
    'Network connectivity issues',
    'Mobile money service temporarily unavailable',
    'Invalid PIN entered multiple times - account temporarily locked',
    'Transaction limit exceeded for today'
  ];

  const providerSpecific = {
    'mtn': [
      'MTN Mobile Money service under maintenance',
      'Please ensure your MTN line is active and has mobile money enabled'
    ],
    'vodacom': [
      'M-Pesa service temporarily unavailable',
      'Please check if your Vodacom line has M-Pesa activated'
    ],
    'zamtel': [
      'Zamtel Kwacha service experiencing high traffic',
      'Please ensure your Zamtel line has Kwacha service enabled'
    ]
  };

  const allReasons = [...commonReasons, ...(providerSpecific[provider] || [])];
  return allReasons[Math.floor(Math.random() * allReasons.length)];
}

// Get realistic processing times for different providers
function getProcessingTime(provider: string): string {
  const times = {
    'mtn': '1-3 minutes',
    'vodacom': '30 seconds - 2 minutes', 
    'zamtel': '1-5 minutes'
  };
  
  return times[provider] || '1-3 minutes';
}