// ZRA Smart Invoice completion (2026-11-21) — source pins for the
// whole fiscal pipeline. Behaviour is proven live (QA institutions
// against the spec-faithful VSDC stub); these tests pin the wiring so
// a future edit cannot quietly remove a gate:
//   - the declaration trigger on the paid transition (no client path
//     can skip declaration) and the credit-note queue on refund;
//   - the Zambia-only rule at every layer (UI absence, edge-function
//     refusal, queue gate, RLS helper fold, write-binding triggers);
//   - credentials never reaching the client (masked serial, settings
//     writes only via the admin-gated edge function);
//   - the fiscal block rendering ONLY from a real ZRA declaration.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

const MIG1 = "supabase/migrations/20261121_zra_smart_invoice_completion.sql";
const MIG2 = "supabase/migrations/20261121_zra_zambia_only_gate.sql";
const MIG3 = "supabase/migrations/20261121_zra_zambia_gate_database_layer.sql";
const CONN = "supabase/functions/zra-connection/index.ts";
const DECLARE = "supabase/functions/zra-declare/index.ts";
const PAGE = "src/pages/ZraSmartInvoiceIntegration.tsx";
const BILLING = "src/pages/Billing.tsx";
const DASHBOARD = "src/pages/InstitutionDashboard.tsx";

describe("declaration queue (migration 1)", () => {
  const sql = readSrc(MIG1);

  it("queues a sale when an invoice becomes paid, via a DB trigger", () => {
    expect(sql).toContain("CREATE TRIGGER trg_queue_zra_declaration");
    expect(sql).toContain("AFTER INSERT OR UPDATE OF status ON public.billing_invoices");
    expect(sql).toContain("NEW.status = 'paid'");
    expect(sql).toContain("'sale', 'queued'");
  });

  it("queues a credit note when a declared invoice is refunded/cancelled", () => {
    expect(sql).toContain("NEW.status IN ('refunded', 'cancelled')");
    expect(sql).toContain("'credit_note', 'queued'");
    expect(sql).toContain("original_submission_id");
  });

  it("keeps one live submission per invoice and kind (idempotency)", () => {
    expect(sql).toContain("fiscal_submissions_billing_kind_live_uniq");
    expect(sql).toContain("ON CONFLICT (billing_invoice_id, kind)");
  });

  it("puts the fiscal fields on the invoice of record", () => {
    for (const col of ["zra_declaration_status", "zra_sdc_id", "zra_rcpt_no", "zra_qr_code_url", "zra_declared_at", "zra_credit_note_rcpt_no"]) {
      expect(sql).toContain(col);
    }
  });

  it("adds the refund RPC with the billing-team gate", () => {
    expect(sql).toContain("refund_billing_invoice");
    expect(sql).toContain("is_institution_finance_staff");
    expect(sql).toContain("Only an invoice that has been paid can be refunded.");
  });

  it("schedules the retry sweep and keeps the sweep secret server-only", () => {
    expect(sql).toContain("zra-declaration-sweep");
    expect(sql).toContain("zra_internal_config");
    expect(sql).toContain("REVOKE ALL ON public.zra_internal_config FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("TO service_role");
  });

  it("follows the CEO grant rule on the new tax mapping table", () => {
    expect(sql).toContain("REVOKE ALL ON public.institution_zra_tax_mappings FROM anon");
    expect(sql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE");
  });
});

describe("Zambia-only gate — database layer (migrations 2 + 3)", () => {
  const mig2 = readSrc(MIG2);
  const mig3 = readSrc(MIG3);

  it("eligibility is exactly country_code = 'ZM', fail closed", () => {
    expect(mig2).toContain("zra_country_eligible");
    expect(mig2).toContain("country_code = 'ZM'");
    expect(mig2).toContain("IF NOT public.zra_country_eligible(NEW.institution_id)");
  });

  it("folds the country check into the RLS helpers", () => {
    expect(mig3).toContain("is_zra_institution_member");
    expect(mig3).toContain("is_zra_institution_admin");
    expect(mig3).toContain("public.zra_country_eligible(p_institution_id)");
  });

  it("binds writes with triggers on every ZRA table (service_role cannot bypass)", () => {
    for (const tbl of [
      "institution_smart_invoice_settings",
      "zra_smart_invoice_config",
      "institution_zra_item_mappings",
      "institution_zra_tax_mappings",
      "vsdc_operation_logs",
      "smart_invoices",
      "fiscal_submissions",
    ]) {
      expect(mig3).toContain(`ON public.${tbl}`);
    }
    expect(mig3).toContain("zra_assert_zambian_institution");
    expect(mig3).toContain("ZRA Smart Invoice is only available to institutions in Zambia.");
  });

  it("gates the settings getter RPC by country too", () => {
    expect(mig3).toContain("get_smart_invoice_settings_public");
    expect(mig3).toContain("public.zra_country_eligible(p_institution_id)");
  });
});

describe("zra-connection edge function", () => {
  const src = readSrc(CONN);

  it("refuses non-Zambian institutions before anything else", () => {
    expect(src).toContain('inst.country_code !== "ZM"');
    expect(src).toContain("ZRA Smart Invoice is only available to institutions in Zambia.");
  });

  it("requires the institution-admin gate (house helper)", () => {
    expect(src).toContain("is_zra_institution_admin");
  });

  it("performs the real ZRA device initialisation", () => {
    expect(src).toContain("/initializer/selectInitInfo");
    expect(src).toContain("dvcSrlNo");
    expect(src).toContain("sdc_id");
    expect(src).toContain("zra_backfill_declarations");
  });

  it("never returns the stored device serial in full", () => {
    expect(src).toContain("device_serial_masked");
    expect(src).toContain("maskSerial");
    expect(src).not.toContain("encrypted_credentials");
  });

  it("treats 902 (already installed) honestly", () => {
    expect(src).toContain('"902"');
    expect(src).toContain("not installed through Doc'O Clock");
  });
});

describe("zra-declare edge function", () => {
  const src = readSrc(DECLARE);

  it("authenticates the sweep by the internal secret and admins by the house gate", () => {
    expect(src).toContain("x-zra-internal-secret");
    expect(src).toContain("ZRA_INTERNAL_SECRET");
    expect(src).toContain("is_zra_institution_admin");
  });

  it("refuses non-Zambian institutions and closes out stray submissions", () => {
    expect(src).toContain('inst.country_code !== "ZM"');
    expect(src).toContain("not based in Zambia");
  });

  it("resolves tax on the server only (template -> resolve_item_tax_rate -> institution mapping)", () => {
    expect(src).toContain("resolve_item_tax_rate");
    expect(src).toContain("institution_zra_tax_mappings");
  });

  it("claims rows before sending so a declaration is never sent twice", () => {
    expect(src).toContain('status: "sending"');
    expect(src).toContain('.in("status", ["queued", "failed"])');
  });

  it("freezes the payload, registers items, and recovers proofs after transport failures", () => {
    expect(src).toContain("request_payload: payload");
    expect(src).toContain("/items/saveItem");
    expect(src).toContain("/trnsSales/selectInvoice");
    expect(src).toContain("/trnsSales/saveSales");
  });

  it("writes the ZRA proof back to the invoice and retries with backoff", () => {
    expect(src).toContain("zra_declaration_status: \"declared\"");
    expect(src).toContain("zra_rcpt_no");
    expect(src).toContain("zra_credit_note_rcpt_no");
    expect(src).toContain("backoffSeconds");
  });

  it("builds credit notes against the original receipt", () => {
    expect(src).toContain('rcptTyCd: isCredit ? "R" : "S"');
    expect(src).toContain("orgInvcNo");
    expect(src).toContain("orgSdcId");
  });
});

describe("ZRA settings page", () => {
  const src = readSrc(PAGE);

  it("is entirely absent for non-Zambian institutions", () => {
    expect(src).toContain('country_code === "ZM"');
    expect(src).toContain('<Navigate to="/institution-portal" replace />');
  });

  it("goes through the edge functions — no direct settings writes, no browser probe", () => {
    expect(src).toContain('callZraFunction("zra-connection"');
    expect(src).toContain('callZraFunction("zra-declare"');
    expect(src).not.toContain("institution_smart_invoice_settings");
    expect(src).not.toContain("probeVsdc");
    expect(src).not.toContain("no-cors");
  });

  it("explains the VSDC cloud-reachability truth in plain language", () => {
    expect(src).toContain("cannot be reached");
    expect(src).toContain("reachable over the internet");
    expect(src).toContain("OSDC");
  });

  it("shows honest declaration states", () => {
    expect(src).toContain("Awaiting declaration");
    expect(src).toContain("will retry automatically");
  });
});

describe("billing surfaces", () => {
  const src = readSrc(BILLING);
  const dash = readSrc(DASHBOARD);

  it("shows the fiscal block only when declared, and only for Zambia", () => {
    expect(src).toContain('isZambia && showReceipt.zra_declaration_status === "declared"');
    expect(src).toContain("zra-fiscal-block");
    expect(src).toContain("<QrCode");
  });

  it("shows an honest pending note before declaration", () => {
    expect(src).toContain("Awaiting ZRA declaration — the fiscal receipt details will appear here once ZRA confirms");
  });

  it("refunds through the RPC (which queues the ZRA credit note)", () => {
    expect(src).toContain('rpc("refund_billing_invoice"');
  });

  it("hides the dashboard entry point for non-Zambian institutions", () => {
    expect(dash).toContain('action.path !== "/zra-smart-invoice"');
    expect(dash).toContain('country_code === "ZM"');
  });
});
