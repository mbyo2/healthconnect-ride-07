import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
  type: 'emergency' | 'appointment' | 'prescription' | 'order';
  patientId?: string;
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

    const { phone, message, type, patientId } = await req.json() as SMSRequest;

    // Format phone number for Zambian mobile networks
    const formatZambianPhone = (phoneNumber: string): string => {
      // Remove any non-digit characters
      const digits = phoneNumber.replace(/\D/g, '');
      
      // Handle Zambian phone formats
      if (digits.startsWith('260')) {
        return '+' + digits; // Already has country code
      } else if (digits.startsWith('0')) {
        return '+260' + digits.substring(1); // Replace leading 0 with +260
      } else if (digits.length === 9) {
        return '+260' + digits; // Add country code
      }
      
      return '+260' + digits; // Default fallback
    };

    const formattedPhone = formatZambianPhone(phone);

    // In a real implementation, integrate with Zambian SMS providers like:
    // - Vodacom Zambia SMS API
    // - MTN Zambia SMS API  
    // - Zamtel SMS API
    // - Africa's Talking SMS API (supports Zambia)

    // For demo purposes, we'll simulate SMS sending
    const smsProviders = {
      'emergency': {
        priority: 'high',
        retries: 3,
        provider: 'priority_gateway'
      },
      'appointment': {
        priority: 'medium', 
        retries: 1,
        provider: 'standard_gateway'
      },
      'prescription': {
        priority: 'medium',
        retries: 2,
        provider: 'standard_gateway'
      },
      'order': {
        priority: 'low',
        retries: 1,
        provider: 'bulk_gateway'
      }
    };

    const smsConfig = smsProviders[type] || smsProviders['appointment'];

    // Simulate SMS API call (replace with actual provider)
    const smsResponse = await simulateZambianSMS(formattedPhone, message, smsConfig);

    // Log SMS attempt in database
    const { error: logError } = await supabaseClient
      .from('sms_logs')
      .insert({
        phone: formattedPhone,
        message: message,
        type: type,
        patient_id: patientId,
        status: smsResponse.success ? 'sent' : 'failed',
        provider: smsConfig.provider,
        response_data: smsResponse,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging SMS:', logError);
    }

    if (!smsResponse.success) {
      throw new Error(smsResponse.error || 'Failed to send SMS');
    }

    console.log(`SMS sent successfully to ${formattedPhone}:`, smsResponse);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: smsResponse.messageId,
        phone: formattedPhone,
        message: 'SMS sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending SMS:', error);
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

// Simulate SMS sending for Zambian networks
async function simulateZambianSMS(phone: string, message: string, config: any) {
  // In production, this would make actual API calls to:
  // - Africa's Talking: https://api.africastalking.com/version1/messaging
  // - Vodacom Business API
  // - MTN Business API
  // - Zamtel API

  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: 'Network error - message not delivered',
        provider: config.provider
      };
    }

    // Simulate success response
    return {
      success: true,
      messageId: `ZM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      phone: phone,
      cost: calculateSMSCost(message, phone),
      provider: config.provider,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider: config.provider
    };
  }
}

// Calculate SMS cost for Zambian networks
function calculateSMSCost(message: string, phone: string): number {
  const messageLength = message.length;
  const smsCount = Math.ceil(messageLength / 160); // Standard SMS length
  
  // Zambian SMS pricing (in ZMW)
  const baseCost = 0.15; // ~15 ngwee per SMS
  
  // Different rates for different networks
  if (phone.includes('977') || phone.includes('966')) { // MTN
    return smsCount * baseCost * 1.0;
  } else if (phone.includes('967') || phone.includes('976')) { // Vodacom  
    return smsCount * baseCost * 0.95;
  } else if (phone.includes('978')) { // Zamtel
    return smsCount * baseCost * 0.90;
  }
  
  return smsCount * baseCost; // Default rate
}