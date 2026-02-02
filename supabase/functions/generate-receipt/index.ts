import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId } = await req.json();

    // Get payment details with related information
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`
        *,
        patient:profiles!patient_id(*),
        provider:profiles!provider_id(*),
        service:healthcare_services(*)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;
    if (!payment) throw new Error('Payment not found');

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height, width } = page.getSize();

    // Add content to PDF
    const fontSize = 12;
    page.drawText('Payment Receipt', {
      x: 50,
      y: height - 50,
      size: 20,
    });

    // Add payment details
    const details = [
      `Receipt Number: ${payment.invoice_number}`,
      `Date: ${new Date(payment.created_at).toLocaleDateString()}`,
      `Patient: ${payment.patient.first_name} ${payment.patient.last_name}`,
      `Provider: ${payment.provider.first_name} ${payment.provider.last_name}`,
      `Service: ${payment.service.name}`,
      `Amount: $${payment.amount}`,
      `Status: ${payment.status}`,
    ];

    details.forEach((text, index) => {
      page.drawText(text, {
        x: 50,
        y: height - 100 - (index * 20),
        size: fontSize,
      });
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient
      .storage
      .from('receipts')
      .upload(`${paymentId}.pdf`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    console.log('Receipt generated successfully:', paymentId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error generating receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});