import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId } = await req.json();
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Missing paymentId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`*, patient:profiles!patient_id(*), provider:profiles!provider_id(*), service:healthcare_services(*)`)
      .eq('id', paymentId)
      .maybeSingle();
    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Ownership check — only participants or admins
    const { data: profile } = await supabaseClient
      .from('profiles').select('admin_level').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.admin_level === 'admin' || profile?.admin_level === 'superadmin';
    if (!isAdmin && payment.patient_id !== user.id && payment.provider_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    page.drawText('Payment Receipt', { x: 50, y: height - 50, size: 20 });

    const details = [
      `Receipt Number: ${payment.invoice_number}`,
      `Date: ${new Date(payment.created_at).toLocaleDateString()}`,
      `Patient: ${payment.patient?.first_name ?? ''} ${payment.patient?.last_name ?? ''}`,
      `Provider: ${payment.provider?.first_name ?? ''} ${payment.provider?.last_name ?? ''}`,
      `Service: ${payment.service?.name ?? ''}`,
      `Amount: $${payment.amount}`,
      `Status: ${payment.status}`,
    ];
    details.forEach((text, i) => page.drawText(text, { x: 50, y: height - 100 - i * 20, size: 12 }));

    const pdfBytes = await pdfDoc.save();
    const { error: uploadError } = await supabaseClient
      .storage.from('receipts')
      .upload(`${paymentId}.pdf`, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
