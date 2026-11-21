// zra-declare — the ZRA Smart Invoice declaration worker.
//
// Processes fiscal_submissions (the outbox the billing trigger fills):
// builds the saveSales payload server-side (tax resolved via
// resolve_item_tax_rate + the institution's ZRA tax mappings — never
// from the client), registers items on first use, declares the sale or
// credit note, and writes the ZRA proof back onto the submission and
// the billing invoice. Failures keep the invoice's honest state and
// retry with backoff; local billing never blocks on ZRA.
//
// Auth (either):
//   - the pg_cron sweep: header x-zra-internal-secret matching the
//     ZRA_INTERNAL_SECRET function secret (also stored, server-side
//     only, in zra_internal_config for the SQL wrapper), or
//   - an institution admin's JWT (is_zra_institution_admin), scoped to
//     their own institution — used by the settings page's retry button.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

type AdminClient = ReturnType<typeof createClient>;
import {
  backoffSeconds,
  buildItemPayload,
  buildSalesPayload,
  composeQrUrl,
  defaultControllerBaseUrl,
  generateItemCode,
  parseEnvelope,
  parseSalesProof,
  plainResultMessage,
  portalBaseFor,
  round2,
  zraPaymentTypeCode,
  ZraError,
  type ZraSalesLine,
} from "../_shared/zra.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, x-zra-internal-secret",
};

// UNSPSC fallback for Doc'O Clock services (billing services). An
// institution can override the class per item in its ZRA item mappings.
const DEFAULT_ITEM_CLASS_CD = "84111506";
const ITEM_TYPE_SERVICE = "3";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Format an ISO timestamp as yyyyMMddHHmmss in Africa/Lusaka (UTC+2). */
function lusakaDateTime(iso: string): string {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${shifted.getUTCFullYear()}${p(shifted.getUTCMonth() + 1)}${p(shifted.getUTCDate())}${p(shifted.getUTCHours())}${p(shifted.getUTCMinutes())}${p(shifted.getUTCSeconds())}`;
}

function hashSerial(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return (h % 9000000) + 1;
}

interface ControllerResult {
  envelope: { resultCd: string; resultMsg: string; data: any };
}

async function postToController(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<ControllerResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ZraError(
        "The ZRA controller answered, but its reply could not be understood.",
      );
    }
    return { envelope: parseEnvelope(parsed) as any };
  } catch (err) {
    if (err instanceof ZraError) throw err;
    throw new ZraError(
      "We could not reach the ZRA controller. The declaration will be retried automatically.",
    );
  } finally {
    clearTimeout(timer);
  }
}

function resolveBaseUrl(settings: Record<string, any>): string {
  const stored = String(settings.vsdc_base_url || "").trim().replace(/\/$/, "");
  if (stored) return stored;
  return defaultControllerBaseUrl(
    String(settings.controller_type || "vsdc"),
    String(settings.environment || "sandbox"),
  );
}

// ---------------------------------------------------------------------------
// Payload conversion: Doc'O Clock billing invoice -> ZRA sales lines.
// The invoice of record is authoritative for totals: line taxes are
// resolved server-side (service tax template -> resolve_item_tax_rate),
// then reconciled to the tax the invoice actually charged; the discount
// is distributed pro-rata; the ZRA library works in tax-inclusive terms.
// ---------------------------------------------------------------------------
interface PreparedLine {
  zra: ZraSalesLine;
  itemCd: string;
  itemClsCd: string;
  name: string;
  band: string;
  unitPrice: number;
  needsRegister: boolean;
  mappingId: string | null;
}

async function prepareLines(
  admin: AdminClient,
  settings: Record<string, any>,
  invoice: Record<string, any>,
): Promise<PreparedLine[]> {
  const institutionId = invoice.institution_id as string;
  const rawItems: Record<string, any>[] = Array.isArray(invoice.items) ? invoice.items : [];
  if (rawItems.length === 0) {
    throw new ZraError("This invoice has no lines to declare.");
  }

  // Institution tax mappings: Doc rate % -> ZRA band label.
  const { data: mappingRows } = await admin
    .from("institution_zra_tax_mappings")
    .select("doc_rate_percent, zra_tax_label")
    .eq("institution_id", institutionId);
  const bandByRate = new Map<number, string>();
  for (const m of mappingRows ?? []) {
    bandByRate.set(Number(m.doc_rate_percent), String(m.zra_tax_label));
  }

  interface Work {
    raw: Record<string, any>;
    qty: number;
    unitPrice: number;
    exclusive: number;
    docRate: number; // rate % resolved from the service's tax template
    effRate: number; // rate % after reconciling to the invoice's tax
    gross: number;
    dcAmt: number;
    totAmt: number;
    band: string;
  }
  const work: Work[] = [];

  for (const raw of rawItems) {
    const qty = Number(raw.quantity ?? 1) || 1;
    const unitPrice = Number(raw.unit_price ?? 0);
    const exclusive = round2(raw.total != null ? Number(raw.total) : qty * unitPrice);
    let docRate = 0;
    const pricingId = raw.service_pricing_id as string | undefined;
    if (pricingId) {
      const { data: pricing } = await admin
        .from("service_pricing")
        .select("tax_template_id")
        .eq("id", pricingId)
        .maybeSingle();
      if (pricing) {
        const { data: frac } = await admin.rpc("resolve_item_tax_rate", {
          p_institution_id: institutionId,
          p_template_id: pricing.tax_template_id ?? null,
          p_fallback: 0,
        });
        if (typeof frac === "number") docRate = round2(frac * 100);
      }
    }
    work.push({
      raw, qty, unitPrice, exclusive,
      docRate, effRate: docRate, gross: 0, dcAmt: 0, totAmt: 0, band: "D",
    });
  }

  const invoiceTax = Number(invoice.tax ?? 0);
  const sumExclusive = work.reduce((s, w) => s + w.exclusive, 0);
  const sumRawTax = work.reduce((s, w) => s + (w.exclusive * w.docRate) / 100, 0);

  if (invoiceTax <= 0) {
    for (const w of work) w.effRate = 0;
  } else if (sumRawTax > 0) {
    const factor = invoiceTax / sumRawTax;
    for (const w of work) w.effRate = round2(w.docRate * factor);
  } else if (sumExclusive > 0) {
    const implied = round2((invoiceTax / sumExclusive) * 100);
    for (const w of work) w.effRate = implied;
  }

  for (const w of work) {
    w.gross = round2(w.exclusive + (w.exclusive * w.effRate) / 100);
    w.band = bandByRate.get(w.docRate) ?? (w.effRate > 0 ? "A" : "D");
  }

  // Discount distributed pro-rata over gross amounts.
  const totalDiscount = Number(invoice.discount ?? 0);
  const sumGross = work.reduce((s, w) => s + w.gross, 0);
  if (totalDiscount > 0 && sumGross > 0) {
    let assigned = 0;
    work.forEach((w, i) => {
      w.dcAmt = i === work.length - 1
        ? round2(totalDiscount - assigned)
        : round2((totalDiscount * w.gross) / sumGross);
      assigned = round2(assigned + w.dcAmt);
    });
  }
  for (const w of work) w.totAmt = round2(w.gross - w.dcAmt);

  // Keep the declaration total identical to the invoice of record.
  const invoiceTotal = Number(invoice.total_amount ?? 0);
  const sumTot = work.reduce((s, w) => s + w.totAmt, 0);
  const diff = round2(invoiceTotal - sumTot);
  if (diff !== 0 && work.length > 0) {
    let largest = work[0];
    for (const w of work) if (w.totAmt > largest.totAmt) largest = w;
    largest.totAmt = round2(largest.totAmt + diff);
    largest.gross = round2(largest.gross + diff);
  }

  // Item identity + registration state per line.
  const prepared: PreparedLine[] = [];
  for (const w of work) {
    const raw = w.raw;
    const name = String(raw.description || raw.item_name || "Service").slice(0, 200);
    const catalogId = (raw.service_pricing_id as string) || null;
    let itemCd: string;
    let itemClsCd = DEFAULT_ITEM_CLASS_CD;
    let needsRegister = false;
    let mappingId: string | null = null;

    // A per-item tax band set on the item mapping overrides the
    // per-rate mapping for this line.
    let lineBand = w.band;
    if (catalogId) {
      const { data: mapping } = await admin
        .from("institution_zra_item_mappings")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("catalog_item_id", catalogId)
        .maybeSingle();
      if (mapping) {
        mappingId = mapping.id;
        itemCd = mapping.zra_item_code;
        itemClsCd = mapping.zra_item_class_code || DEFAULT_ITEM_CLASS_CD;
        needsRegister = !mapping.synced_at;
        if (mapping.tax_type_code) lineBand = String(mapping.tax_type_code);
      } else {
        const { count } = await admin
          .from("institution_zra_item_mappings")
          .select("id", { count: "exact", head: true })
          .eq("institution_id", institutionId);
        let serial = (count ?? 0) + 1;
        itemCd = generateItemCode("ZM", ITEM_TYPE_SERVICE, "EA", "U", serial);
        // Avoid a code collision with an existing mapping.
        for (let tries = 0; tries < 5; tries++) {
          const { data: clash } = await admin
            .from("institution_zra_item_mappings")
            .select("id")
            .eq("institution_id", institutionId)
            .eq("zra_item_code", itemCd)
            .maybeSingle();
          if (!clash) break;
          serial += 1;
          itemCd = generateItemCode("ZM", ITEM_TYPE_SERVICE, "EA", "U", serial);
        }
        const { data: created } = await admin
          .from("institution_zra_item_mappings")
          .insert({
            institution_id: institutionId,
            catalog_item_id: catalogId,
            zra_item_code: itemCd,
            zra_item_class_code: DEFAULT_ITEM_CLASS_CD,
            zra_item_type_code: ITEM_TYPE_SERVICE,
            tax_type_code: w.band,
            quantity_unit_code: "U",
            package_unit_code: "EA",
            default_price: w.unitPrice,
            is_active: true,
          })
          .select("id")
          .single();
        mappingId = created?.id ?? null;
        needsRegister = true;
      }
    } else {
      itemCd = generateItemCode(
        "ZM", ITEM_TYPE_SERVICE, "EA", "U",
        hashSerial(`${institutionId}:${name}`),
      );
      needsRegister = true;
    }

    const dcRt = w.gross > 0 ? Math.round((w.dcAmt / w.gross) * 100 * 10000) / 10000 : 0;
    prepared.push({
      zra: {
        itemCd,
        itemClsCd,
        name,
        qty: w.qty,
        totAmt: w.totAmt,
        discount: dcRt,
        taxes: [{ band: lineBand, rate: w.effRate }],
      },
      itemCd,
      itemClsCd,
      name,
      band: lineBand,
      unitPrice: w.unitPrice,
      needsRegister,
      mappingId,
    });
  }
  return prepared;
}

// ---------------------------------------------------------------------------
// One submission end to end.
// ---------------------------------------------------------------------------
interface Outcome {
  id: string;
  status: "sent" | "failed";
  message: string;
}

async function failSubmission(
  admin: AdminClient,
  sub: Record<string, any>,
  message: string,
  retryable: boolean,
): Promise<Outcome> {
  const attempts = Number(sub.attempt_count ?? 1);
  await admin.from("fiscal_submissions").update({
    status: "failed",
    last_error: message,
    next_retry_at: retryable
      ? new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }).eq("id", sub.id);
  if (sub.kind === "sale" && sub.billing_invoice_id) {
    await admin.from("billing_invoices").update({
      zra_declaration_status: "failed",
    }).eq("id", sub.billing_invoice_id).neq("zra_declaration_status", "declared");
  }
  return { id: sub.id, status: "failed", message };
}

async function processSubmission(
  admin: AdminClient,
  sub: Record<string, any>,
): Promise<Outcome> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  // ZAMBIA-ONLY (CEO rule, 2026-11-21): a submission for a
  // non-Zambian institution can never be sent. (Creation of such a
  // row is already impossible — the queue trigger checks eligibility
  // and a BEFORE INSERT trigger binds the table — but if one somehow
  // exists, e.g. the institution's country changed, close it out
  // terminally instead of retrying forever. No operation log is
  // written: the logs table is write-bound to Zambia too.)
  {
    const { data: inst } = await admin
      .from("healthcare_institutions")
      .select("country_code")
      .eq("id", sub.institution_id)
      .maybeSingle();
    if (!inst || inst.country_code !== "ZM") {
      const msg = "This institution is not based in Zambia, so ZRA Smart Invoice does not apply to it.";
      await admin.from("fiscal_submissions").update({
        status: "failed",
        last_error: msg,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", sub.id);
      if (sub.kind === "sale" && sub.billing_invoice_id) {
        await admin.from("billing_invoices").update({
          zra_declaration_status: "not_required",
        }).eq("id", sub.billing_invoice_id);
      }
      return { id: sub.id, status: "failed", message: msg };
    }
  }

  const { data: settings } = await admin
    .from("institution_smart_invoice_settings")
    .select("*")
    .eq("institution_id", sub.institution_id)
    .maybeSingle();

  const logOp = async (
    operationType: string,
    operationStatus: string,
    requestPayload: unknown,
    responsePayload: unknown,
    errorMessage: string | null,
  ) => {
    const { error: logErr } = await admin.from("vsdc_operation_logs").insert({
      institution_id: sub.institution_id,
      operation_type: operationType,
      operation_status: operationStatus,
      request_payload: requestPayload ?? null,
      response_payload: responsePayload ?? null,
      error_message: errorMessage,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      performed_by: null,
    });
    // Never swallow a failed log write silently (a legacy CHECK
    // constraint hid exactly this during the 2026-11-21 proof).
    if (logErr) console.error("vsdc_operation_logs insert failed:", logErr.message);
  };

  if (!settings || !settings.initialized_at) {
    const msg = "This institution's ZRA device is not initialised yet, so the declaration is waiting. Initialise the device in the ZRA Smart Invoice settings.";
    await logOp("save_sales", "error", null, null, msg);
    return failSubmission(admin, sub, msg, false);
  }
  const baseUrl = resolveBaseUrl(settings);
  if (!baseUrl) {
    const msg = "No ZRA controller address is configured for this institution, so the declaration cannot be sent yet.";
    await logOp("save_sales", "error", null, null, msg);
    return failSubmission(admin, sub, msg, false);
  }

  const { data: invoice } = await admin
    .from("billing_invoices")
    .select("*")
    .eq("id", sub.billing_invoice_id)
    .maybeSingle();
  if (!invoice) {
    const msg = "The invoice for this declaration could not be found.";
    await logOp("save_sales", "error", null, null, msg);
    return failSubmission(admin, sub, msg, false);
  }

  // Original sale proof for credit notes.
  let original: Record<string, any> | null = null;
  if (sub.kind === "credit_note") {
    if (sub.original_submission_id) {
      const { data } = await admin
        .from("fiscal_submissions")
        .select("*")
        .eq("id", sub.original_submission_id)
        .maybeSingle();
      original = data;
    }
    if (!original || original.status !== "sent" || !original.zra_invoice_number) {
      const msg = "The original invoice has not been declared to ZRA yet, so this credit note is waiting for it.";
      await logOp("save_credit_note", "error", null, null, msg);
      return failSubmission(admin, sub, msg, false);
    }
  }

  // Build (once) and freeze the payload.
  let payload = (sub.request_payload as Record<string, unknown> | null) ?? null;
  if (!payload) {
    try {
      const prepared = await prepareLines(admin, settings, invoice);
      const { data: payments } = await admin
        .from("billing_payments")
        .select("payment_mode, payment_date")
        .eq("invoice_id", invoice.id)
        .order("payment_date", { ascending: false })
        .limit(1);
      const lastPayment = payments?.[0];
      let custMobile: string | null = null;
      if (invoice.patient_id) {
        const { data: profile } = await admin
          .from("profiles")
          .select("phone")
          .eq("id", invoice.patient_id)
          .maybeSingle();
        custMobile = (profile as any)?.phone ?? null;
      }
      const nowIso = new Date().toISOString();
      const isCredit = sub.kind === "credit_note";
      payload = buildSalesPayload({
        tpin: settings.tpin,
        bhfId: settings.bhf_id || "000",
        cisInvcNo: isCredit ? `${invoice.invoice_number}R1` : invoice.invoice_number,
        custNm: invoice.patient_name,
        custMobile,
        rcptTyCd: isCredit ? "R" : "S",
        orgInvcNo: isCredit ? Number(original!.zra_invoice_number) : 0,
        orgSdcId: isCredit ? String(original!.sdc_id || settings.sdc_id || "") : undefined,
        pmtTyCd: zraPaymentTypeCode(lastPayment?.payment_mode),
        salesDt: isCredit ? lusakaDateTime(nowIso) : lusakaDateTime(invoice.created_at),
        cfmDt: isCredit
          ? lusakaDateTime(nowIso)
          : lusakaDateTime(lastPayment?.payment_date || invoice.updated_at),
        rfdRsnCd: isCredit ? "06" : null,
        rfdDt: isCredit ? lusakaDateTime(nowIso) : null,
        currency: "ZMW",
        exchangeRt: "1",
        destnCountryCd: "ZM",
        lines: prepared.map((p) => p.zra),
      });
    } catch (err) {
      const msg = err instanceof ZraError
        ? err.message
        : "The declaration could not be prepared. Please try again.";
      if (!(err instanceof ZraError)) console.error("zra-declare build error:", err);
      await logOp(isCreditOp(sub), "error", null, null, msg);
      return failSubmission(admin, sub, msg, false);
    }
    await admin.from("fiscal_submissions").update({
      request_payload: payload,
      updated_at: new Date().toISOString(),
    }).eq("id", sub.id);
  }

  // Register items on first use (ZRA requires items before sales).
  // Derived from the (possibly frozen) payload so retries after a
  // registration failure still register what is missing: an item needs
  // registering when its mapping is absent or was never synced.
  {
    const payloadItems = Array.isArray((payload as any).itemList)
      ? ((payload as any).itemList as Record<string, any>[])
      : [];
    const seen = new Set<string>();
    for (const item of payloadItems) {
      const itemCd = String(item.itemCd || "");
      if (!itemCd || seen.has(itemCd)) continue;
      seen.add(itemCd);
      const { data: mapping } = await admin
        .from("institution_zra_item_mappings")
        .select("id, synced_at")
        .eq("institution_id", sub.institution_id)
        .eq("zra_item_code", itemCd)
        .maybeSingle();
      if (mapping?.synced_at) continue;
      try {
        const { envelope } = await postToController(baseUrl, "/items/saveItem",
          buildItemPayload(
            { tpin: settings.tpin, bhfId: settings.bhf_id || "000" },
            {
              itemCd,
              itemClsCd: String(item.itemClsCd || DEFAULT_ITEM_CLASS_CD),
              itemTyCd: ITEM_TYPE_SERVICE,
              name: String(item.itemNm || "Service"),
              vatCatCd: String(item.vatCatCd || item.iplCatCd || item.tlCatCd || "A"),
              defaultPrice: Number(item.prc || 0),
            },
          ), 20000);
        if (envelope.resultCd === "000" || envelope.resultCd === "994") {
          if (mapping?.id) {
            await admin.from("institution_zra_item_mappings")
              .update({ synced_at: new Date().toISOString() })
              .eq("id", mapping.id);
          }
        } else {
          throw new ZraError(plainResultMessage(envelope.resultCd, envelope.resultMsg));
        }
      } catch (err) {
        const msg = err instanceof ZraError
          ? err.message
          : "An item on this invoice could not be registered with ZRA. The declaration will be retried automatically.";
        await logOp("save_item", "error", { itemCd }, null, msg);
        return failSubmission(admin, sub, msg, true);
      }
    }
  }

  // Declare.
  const opType = sub.kind === "credit_note" ? "save_credit_note" : "save_sales";
  let envelope: { resultCd: string; resultMsg: string; data: any };
  try {
    ({ envelope } = await postToController(baseUrl, "/trnsSales/saveSales", payload));
  } catch (err) {
    // Ambiguous transport failure: the sale may have landed. Recover
    // the proof via selectInvoice before declaring failure.
    try {
      const recovery = await postToController(baseUrl, "/trnsSales/selectInvoice", {
        tpin: settings.tpin,
        bhfId: settings.bhf_id || "000",
        invcSdcId: settings.sdc_id || "",
        cisInvcNo: (payload as any).cisInvcNo,
      }, 20000);
      if (recovery.envelope.resultCd === "000" && recovery.envelope.data) {
        envelope = recovery.envelope;
      } else {
        throw err;
      }
    } catch {
      const msg = err instanceof ZraError
        ? err.message
        : "We could not reach the ZRA controller. The declaration will be retried automatically.";
      await logOp(opType, "error", payload, null, msg);
      return failSubmission(admin, sub, msg, true);
    }
  }

  if (envelope.resultCd !== "000") {
    const msg = plainResultMessage(envelope.resultCd, envelope.resultMsg);
    await admin.from("fiscal_submissions").update({
      zra_result_code: envelope.resultCd,
      zra_result_message: envelope.resultMsg || null,
      response_payload: envelope as unknown as Record<string, unknown>,
    }).eq("id", sub.id);
    await logOp(opType, "error", payload, envelope, msg);
    const permanent = ["884", "901", "903", "910", "930", "931", "932", "934", "935"]
      .includes(envelope.resultCd);
    return failSubmission(admin, sub, msg, !permanent);
  }

  // Success — write the proof back.
  let proof;
  try {
    proof = parseSalesProof(envelope.data);
  } catch (err) {
    const msg = err instanceof ZraError ? err.message : "ZRA accepted the declaration but returned no receipt details.";
    await logOp(opType, "error", payload, envelope, msg);
    return failSubmission(admin, sub, msg, true);
  }
  const qrUrl = proof.qrCodeUrl || composeQrUrl(
    portalBaseFor(String(settings.environment || "sandbox")),
    String(settings.tpin), String(settings.bhf_id || "000"), proof.rcptSign,
  );
  const nowIso = new Date().toISOString();
  await admin.from("fiscal_submissions").update({
    status: "sent",
    zra_result_code: "000",
    zra_result_message: envelope.resultMsg || null,
    zra_invoice_number: String(proof.rcptNo),
    sdc_id: proof.sdcId || settings.sdc_id || null,
    rcpt_sign: proof.rcptSign || null,
    intrl_data: proof.intrlData || null,
    mrc_no: proof.mrcNo || settings.mrc_no || null,
    qr_code_url: qrUrl || null,
    response_payload: envelope as unknown as Record<string, unknown>,
    accepted_at: nowIso,
    next_retry_at: null,
    last_error: null,
    updated_at: nowIso,
  }).eq("id", sub.id);

  if (sub.kind === "credit_note") {
    await admin.from("billing_invoices").update({
      zra_credit_note_rcpt_no: String(proof.rcptNo),
      zra_credit_note_at: nowIso,
    }).eq("id", invoice.id);
  } else {
    await admin.from("billing_invoices").update({
      zra_declaration_status: "declared",
      zra_sdc_id: proof.sdcId || settings.sdc_id || null,
      zra_rcpt_no: String(proof.rcptNo),
      zra_rcpt_sign: proof.rcptSign || null,
      zra_qr_code_url: qrUrl || null,
      zra_declared_at: nowIso,
    }).eq("id", invoice.id);
  }
  await logOp(opType, "success", payload, envelope, null);
  return { id: sub.id, status: "sent", message: "Accepted by ZRA." };
}

function isCreditOp(sub: Record<string, any>): string {
  return sub.kind === "credit_note" ? "save_credit_note" : "save_sales";
}

// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    let institutionScope: string | null = null;
    let forceSubmissionId: string | null = null;

    const internalSecret = req.headers.get("x-zra-internal-secret");
    const expectedSecret = Deno.env.get("ZRA_INTERNAL_SECRET") ?? "";
    if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
      // Sweep mode: all institutions.
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return json({ ok: false, error: "Please sign in to continue." }, 401);
      }
      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false },
        },
      );
      const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
      if (authErr || !user) {
        return json({ ok: false, error: "Please sign in to continue." }, 401);
      }
      institutionScope = String(body.institution_id || "");
      if (!institutionScope) {
        return json({ ok: false, error: "Choose an institution first." }, 400);
      }
      // ZAMBIA-ONLY (CEO rule, 2026-11-21) — same refusal as
      // zra-connection; the database enforces it again below this.
      {
        const { data: inst } = await admin
          .from("healthcare_institutions")
          .select("country_code")
          .eq("id", institutionScope)
          .maybeSingle();
        if (!inst || inst.country_code !== "ZM") {
          return json(
            { ok: false, error: "ZRA Smart Invoice is only available to institutions in Zambia." },
            403,
          );
        }
      }
      const { data: isAdmin, error: gateErr } = await supabaseAuth.rpc(
        "is_zra_institution_admin",
        { p_institution_id: institutionScope },
      );
      if (gateErr || !isAdmin) {
        return json(
          { ok: false, error: "Only this institution's admin can run its ZRA declarations." },
          403,
        );
      }
      forceSubmissionId = body.submission_id ? String(body.submission_id) : null;
    }

    // Pick the work.
    let rows: Record<string, any>[] = [];
    if (forceSubmissionId) {
      const { data } = await admin
        .from("fiscal_submissions")
        .select("*")
        .eq("id", forceSubmissionId)
        .eq("institution_id", institutionScope!)
        .maybeSingle();
      if (data && (data.status === "queued" || data.status === "failed")) {
        rows = [data];
      }
    } else {
      let query = admin
        .from("fiscal_submissions")
        .select("*")
        .or(`status.eq.queued,and(status.eq.failed,next_retry_at.not.is.null,next_retry_at.lte.${new Date().toISOString()})`)
        .order("created_at", { ascending: true })
        .limit(20);
      if (institutionScope) query = query.eq("institution_id", institutionScope);
      const { data } = await query;
      rows = data ?? [];
    }

    const outcomes: Outcome[] = [];
    for (const row of rows) {
      // Claim the row so a concurrent sweep cannot send it twice.
      const { data: claimed } = await admin
        .from("fiscal_submissions")
        .update({
          status: "sending",
          attempt_count: Number(row.attempt_count ?? 0) + 1,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .in("status", ["queued", "failed"])
        .select("*")
        .maybeSingle();
      if (!claimed) continue;
      try {
        outcomes.push(await processSubmission(admin, claimed));
      } catch (err) {
        console.error("zra-declare processing error:", err);
        outcomes.push(await failSubmission(
          admin, claimed,
          "The declaration could not be completed. It will be retried automatically.",
          true,
        ));
      }
    }

    return json({ ok: true, processed: outcomes });
  } catch (err) {
    console.error("zra-declare error:", err);
    return json(
      { ok: false, error: "Something went wrong while processing declarations. Please try again." },
      500,
    );
  }
});
