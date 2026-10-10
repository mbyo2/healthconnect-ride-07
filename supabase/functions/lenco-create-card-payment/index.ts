// Lenco card collections — PCI-sensitive: card details are encrypted client-side
// via JWE and never logged. Requires PCI DSS certification for production use.
//
// Flow:
// 1. Frontend collects card details (never stored, never logged)
// 2. Calls this function with card details + payment info
// 3. Function fetches fresh encryption key from Lenco (GET /encryption-key)
// 4. Encrypts payload as JWE (RSA-OAEP-256 + A256GCM)
// 5. POSTs to /collections/card
// 6. Returns status — may be "3ds-auth-required" with redirect URL

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LENCO_SECRET_KEY = Deno.env.get("LENCO_SECRET_KEY") || "";
const LENCO_API_URL = Deno.env.get("LENCO_API_URL") || "https://api.lenco.co/access/v2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CardPaymentRequest {
  amount: number;
  currency?: string;
  reference_type: string;
  reference_id?: string | null;
  description?: string;
  email: string;
  firstName: string;
  lastName: string;
  card: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  billing?: {
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string; // 2-letter, e.g. "ZM"
  };
  redirectUrl?: string;
}

function generateReference(): string {
  return `CARD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// JWE encryption using Web Crypto API (available in Deno)
async function encryptCardPayload(plaintext: string, jwk: any): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // Generate CEK for A256GCM
  const cek = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt CEK with RSA-OAEP-256
  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    cek
  );

  // Protected header (per Lenco docs: must include cty and kid)
  const protectedHeader = {
    alg: "RSA-OAEP-256",
    enc: "A256GCM",
    cty: "application/json",
    kid: jwk.kid,
  };
  const encodedProtected = btoa(JSON.stringify(protectedHeader))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  // Encrypt content with AES-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encoder = new TextEncoder();
  const encodedAAD = encoder.encode(encodedProtected);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encodedAAD },
    aesKey,
    encoder.encode(plaintext)
  );

  // Split ciphertext and tag (last 16 bytes)
  const ctArray = new Uint8Array(ciphertext);
  const actualCiphertext = ctArray.slice(0, ctArray.length - 16);
  const tag = ctArray.slice(ctArray.length - 16);

  const b64url = (buf: Uint8Array | ArrayBuffer) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  return [
    encodedProtected,
    b64url(encryptedKey),
    b64url(iv),
    b64url(actualCiphertext),
    b64url(tag),
  ].join(".");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LENCO_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CardPaymentRequest = await req.json();
    const {
      amount, currency = "ZMW", reference_type, reference_id,
      description, email, firstName, lastName, card, billing, redirectUrl,
    } = body;

    // Validate — never log card details
    if (!amount || amount <= 0 || !email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!card?.number || !card?.expiryMonth || !card?.expiryYear || !card?.cvv) {
      return new Response(
        JSON.stringify({ error: "Incomplete card details" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic card number validation (Luhn)
    const digits = card.number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      return new Response(
        JSON.stringify({ error: "Invalid card number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reference = generateReference();

    // 1. Fetch fresh encryption key from Lenco (don't cache)
    const keyRes = await fetch(`${LENCO_API_URL}/encryption-key`, {
      headers: { "Authorization": `Bearer ${LENCO_SECRET_KEY}` },
    });
    if (!keyRes.ok) {
      console.error("Failed to fetch Lenco encryption key");
      return new Response(
        JSON.stringify({ error: "Could not initialize secure payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const keyJson = await keyRes.json();
    const jwk = keyJson.data?.key || keyJson.data;
    if (!jwk) {
      return new Response(
        JSON.stringify({ error: "Could not initialize secure payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Build plaintext payload (never logged)
    const payload = {
      email,
      reference,
      amount,
      currency,
      customer: { firstName, lastName },
      billing: billing || {
        streetAddress: "N/A",
        city: "Lusaka",
        postalCode: "10101",
        country: "ZM",
      },
      card: {
        number: digits,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cvv: card.cvv,
      },
      ...(redirectUrl ? { redirectUrl } : {}),
    };

    // 3. Encrypt as JWE
    const encryptedPayload = await encryptCardPayload(JSON.stringify(payload), jwk);

    // 4. POST to /collections/card
    const lencoRes = await fetch(`${LENCO_API_URL}/collections/card`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LENCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encryptedPayload }),
    });

    const lencoJson = await lencoRes.json();

    if (!lencoJson.status) {
      console.error("Lenco card collection failed:", lencoJson.message);
      return new Response(
        JSON.stringify({ error: lencoJson.message || "Card payment failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const collection = lencoJson.data;

    // 5. Record in lenco_payments table (no card details stored)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    await supabase.from("lenco_payments").insert({
      reference,
      lenco_reference: collection.lencoReference,
      amount,
      currency,
      status: collection.status === "successful" ? "paid" : "pending",
      lenco_status: collection.status,
      payment_type: "card",
      reference_type,
      reference_id: reference_id || null,
      description: description || `Card payment ${reference}`,
      user_id: userId,
      card_last4: collection.cardDetails?.last4 || digits.slice(-4),
      card_type: collection.cardDetails?.cardType || null,
    });

    // 6. Handle 3DS redirect
    if (collection.status === "3ds-auth-required" && collection.meta?.authorization?.redirect) {
      return new Response(
        JSON.stringify({
          reference,
          status: "3ds_required",
          redirectUrl: collection.meta.authorization.redirect,
          message: "Card requires 3D Secure authentication",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        reference,
        status: collection.status === "successful" ? "paid" : "pending",
        lenco_status: collection.status,
        card_last4: digits.slice(-4),
        message: collection.status === "successful"
          ? "Payment successful"
          : "Payment initiated — check status",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Card payment error:", err.message); // never log card details
    return new Response(
      JSON.stringify({ error: "Payment processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
