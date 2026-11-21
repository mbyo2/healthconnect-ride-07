// zra-connection — institution-admin ZRA Smart Invoice connection
// management: status / save / initialize / test.
//
// The Oct-2025 settings page "initialised" a device with a browser
// probe that never spoke the ZRA protocol. This function performs the
// real device initialisation (/initializer/selectInitInfo) server-side
// and stores the device identity ZRA returns (sdcId, mrcNo).
//
// Auth: the caller must be an admin of the institution (the
// is_zra_institution_admin house helper — institution owner admin_id
// or platform admin scope). All reads/writes go through the service
// role after that check; stored credentials never leave this function
// (status returns the device serial masked).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import {
  defaultControllerBaseUrl,
  parseEnvelope,
  plainResultMessage,
  ZraError,
} from "../_shared/zra.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskSerial(serial: string | null | undefined): string | null {
  if (!serial) return null;
  const s = String(serial);
  return s.length <= 4 ? "••••" : `••••••${s.slice(-4)}`;
}

function resolveBaseUrl(settings: Record<string, any>): string {
  const stored = String(settings.vsdc_base_url || "").trim().replace(/\/$/, "");
  if (stored) return stored;
  return defaultControllerBaseUrl(
    String(settings.controller_type || "vsdc"),
    String(settings.environment || "sandbox"),
  );
}

async function callInitInfo(
  baseUrl: string,
  settings: Record<string, any>,
): Promise<{ envelope: { resultCd: string; resultMsg: string; data: any } }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${baseUrl}/initializer/selectInitInfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tpin: settings.tpin,
        bhfId: settings.bhf_id || "000",
        dvcSrlNo: settings.device_serial_number,
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ZraError(
        "The ZRA controller answered, but its reply could not be understood. Check the controller address and try again.",
      );
    }
    return { envelope: parseEnvelope(parsed) as any };
  } catch (err) {
    if (err instanceof ZraError) throw err;
    throw new ZraError(
      "We could not reach the ZRA controller at that address. Check that the address is correct and that the controller is reachable over the internet, then try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action || "");
    const institutionId = String(body.institution_id || "");
    if (!institutionId) {
      return json({ ok: false, error: "Choose an institution first." }, 400);
    }

    // ZAMBIA-ONLY (CEO rule, 2026-11-21): ZRA Smart Invoice applies
    // only to institutions in Zambia. The same rule is enforced again
    // in the database (RLS helpers + write-binding triggers); this is
    // the friendly front door. country_code is NOT NULL on the
    // institution row; anything other than 'ZM' fails closed.
    {
      const { data: inst } = await admin
        .from("healthcare_institutions")
        .select("country_code")
        .eq("id", institutionId)
        .maybeSingle();
      if (!inst || inst.country_code !== "ZM") {
        return json(
          { ok: false, error: "ZRA Smart Invoice is only available to institutions in Zambia." },
          403,
        );
      }
    }

    // House gate: only this institution's admin (owner or platform
    // admin scope) may see or touch its ZRA connection.
    const { data: isAdmin, error: gateErr } = await supabaseAuth.rpc(
      "is_zra_institution_admin",
      { p_institution_id: institutionId },
    );
    if (gateErr || !isAdmin) {
      return json(
        { ok: false, error: "Only this institution's admin can manage its ZRA Smart Invoice connection." },
        403,
      );
    }

    const loadSettings = async () => {
      const { data } = await admin
        .from("institution_smart_invoice_settings")
        .select("*")
        .eq("institution_id", institutionId)
        .maybeSingle();
      return data as Record<string, any> | null;
    };

    const logOp = async (
      operationType: string,
      operationStatus: string,
      requestPayload: unknown,
      responsePayload: unknown,
      errorMessage: string | null,
      startedAt: string,
      durationMs: number,
    ) => {
      const { error: logErr } = await admin.from("vsdc_operation_logs").insert({
        institution_id: institutionId,
        operation_type: operationType,
        operation_status: operationStatus,
        request_payload: requestPayload ?? null,
        response_payload: responsePayload ?? null,
        error_message: errorMessage,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        performed_by: user.id,
      });
      // Never swallow a failed log write silently (a legacy CHECK
      // constraint hid exactly this during the 2026-11-21 proof).
      if (logErr) console.error("vsdc_operation_logs insert failed:", logErr.message);
    };

    // ---------------------------------------------------------------
    if (action === "status") {
      const s = await loadSettings();
      if (!s) {
        return json({
          ok: true,
          connected: false,
          status: "not_connected",
          controller_type: "vsdc",
          environment: "sandbox",
        });
      }
      return json({
        ok: true,
        connected: Boolean(s.initialized_at),
        status: s.status,
        controller_type: s.controller_type || "vsdc",
        environment: s.environment || "sandbox",
        tpin: s.tpin || "",
        bhf_id: s.bhf_id || "000",
        device_serial_masked: maskSerial(s.device_serial_number),
        has_device_serial: Boolean(s.device_serial_number),
        legal_business_name: s.legal_business_name || "",
        authorized_contact_email: s.authorized_contact_email || "",
        authorized_contact_phone: s.authorized_contact_phone || "",
        vsdc_base_url: s.vsdc_base_url || "",
        sdc_id: s.sdc_id || null,
        mrc_no: s.mrc_no || null,
        taxpayer_name: (s.device_info as any)?.taxprNm || null,
        initialized_at: s.initialized_at || null,
        last_health_check_at: s.last_health_check_at || null,
        last_test_at: s.last_test_at || null,
        last_test_ok: s.last_test_ok ?? null,
        last_error: s.last_error || null,
      });
    }

    // ---------------------------------------------------------------
    if (action === "save") {
      const tpin = String(body.tpin || "").trim();
      const bhfId = String(body.bhf_id || "000").trim() || "000";
      const controllerType = String(body.controller_type || "vsdc");
      const environment = String(body.environment || "sandbox");
      const baseUrl = String(body.vsdc_base_url || "").trim().replace(/\/$/, "");
      const deviceSerial = String(body.device_serial_number || "").trim();

      if (!/^\d{10}$/.test(tpin)) {
        return json({ ok: false, error: "Enter the institution's 10-digit ZRA TPIN." }, 400);
      }
      if (bhfId.length > 3) {
        return json({ ok: false, error: "The Branch ID (BHF ID) is at most 3 characters, for example 000." }, 400);
      }
      if (controllerType !== "vsdc" && controllerType !== "osdc") {
        return json({ ok: false, error: "Choose whether this institution uses a VSDC or an OSDC." }, 400);
      }
      if (environment !== "sandbox" && environment !== "production") {
        return json({ ok: false, error: "Choose the Test or Production environment." }, 400);
      }
      if (baseUrl) {
        try {
          const u = new URL(baseUrl);
          if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
        } catch {
          return json({ ok: false, error: "The controller address does not look like a valid web address." }, 400);
        }
      }
      if (environment === "production" && controllerType === "osdc" && !baseUrl) {
        return json(
          { ok: false, error: "For a production OSDC, enter the controller address ZRA issued to this institution." },
          400,
        );
      }

      const existing = await loadSettings();
      const next: Record<string, unknown> = {
        institution_id: institutionId,
        tpin,
        bhf_id: bhfId,
        controller_type: controllerType,
        environment,
        vsdc_base_url: baseUrl || null,
        legal_business_name: String(body.legal_business_name || "").trim() || null,
        authorized_contact_email: String(body.authorized_contact_email || "").trim() || null,
        authorized_contact_phone: String(body.authorized_contact_phone || "").trim() || null,
        status: existing?.status && existing.status !== "not_connected" ? existing.status : "pending_setup",
      };
      if (deviceSerial) next.device_serial_number = deviceSerial;

      // Changing the device identity after initialisation means the
      // new device has not been initialised — say so honestly by
      // resetting the initialisation state.
      const identityChanged = existing && (
        existing.tpin !== tpin ||
        (existing.bhf_id || "000") !== bhfId ||
        (deviceSerial && existing.device_serial_number !== deviceSerial) ||
        (existing.controller_type || "vsdc") !== controllerType ||
        (existing.environment || "sandbox") !== environment
      );
      if (identityChanged && existing.initialized_at) {
        next.initialized_at = null;
        next.sdc_id = null;
        next.mrc_no = null;
        next.device_info = null;
        next.status = "pending_setup";
      }

      const { error: saveErr } = await admin
        .from("institution_smart_invoice_settings")
        .upsert(next, { onConflict: "institution_id" });
      if (saveErr) {
        console.error("zra-connection save failed:", saveErr.message);
        return json({ ok: false, error: "The connection details could not be saved. Please try again." }, 500);
      }
      return json({ ok: true, message: "Connection details saved." });
    }

    // ---------------------------------------------------------------
    if (action === "initialize" || action === "test") {
      const settings = await loadSettings();
      if (!settings) {
        return json({ ok: false, error: "Save the connection details first, then initialise the device." }, 400);
      }
      if (!settings.tpin || !settings.device_serial_number) {
        return json({ ok: false, error: "Enter the TPIN and the device serial number first, then initialise the device." }, 400);
      }
      const baseUrl = resolveBaseUrl(settings);
      if (!baseUrl) {
        return json(
          { ok: false, error: "Enter the controller address for this institution first — ZRA issues it with the device." },
          400,
        );
      }

      const startedAt = new Date().toISOString();
      const startedMs = Date.now();
      try {
        const { envelope } = await callInitInfo(baseUrl, settings);
        const durationMs = Date.now() - startedMs;
        const cd = envelope.resultCd;

        if (cd === "000" && envelope.data?.info) {
          const info = envelope.data.info as Record<string, unknown>;
          const nowIso = new Date().toISOString();
          const patch: Record<string, unknown> = {
            last_health_check_at: nowIso,
            last_test_at: nowIso,
            last_test_ok: true,
            last_error: null,
          };
          let message = "The ZRA controller answered and recognises this device.";
          if (action === "initialize") {
            patch.sdc_id = info.sdcId ?? null;
            patch.mrc_no = info.mrcNo ?? null;
            patch.device_info = info;
            patch.initialized_at = nowIso;
            patch.status = settings.environment === "production" ? "active" : "sandbox";
            message = `Device initialised. ZRA device ID ${info.sdcId ?? ""} is now linked to this institution.`;
          }
          await admin.from("institution_smart_invoice_settings")
            .update(patch).eq("institution_id", institutionId);
          await logOp(
            action === "initialize" ? "initialize" : "test_connection",
            "success",
            { tpin: settings.tpin, bhfId: settings.bhf_id, base_url: baseUrl },
            { resultCd: cd, sdcId: info.sdcId ?? null },
            null, startedAt, durationMs,
          );

          let backfilled = 0;
          if (action === "initialize") {
            const { data: bf } = await admin.rpc("zra_backfill_declarations", {
              p_institution_id: institutionId,
            });
            backfilled = typeof bf === "number" ? bf : 0;
          }
          return json({
            ok: true,
            message,
            sdc_id: info.sdcId ?? null,
            mrc_no: info.mrcNo ?? null,
            backfilled,
          });
        }

        if (cd === "902") {
          // Already installed at ZRA. That still proves the device and
          // identity for a test; for initialisation it only counts if
          // we already hold the device identity from a past init.
          const nowIso = new Date().toISOString();
          if (action === "test" || settings.sdc_id) {
            await admin.from("institution_smart_invoice_settings").update({
              last_health_check_at: nowIso,
              last_test_at: nowIso,
              last_test_ok: true,
              last_error: null,
              ...(action === "initialize"
                ? {
                    initialized_at: settings.initialized_at || nowIso,
                    status: settings.environment === "production" ? "active" : "sandbox",
                  }
                : {}),
            }).eq("institution_id", institutionId);
            await logOp(
              action === "initialize" ? "initialize" : "test_connection",
              "success",
              { tpin: settings.tpin, bhfId: settings.bhf_id, base_url: baseUrl },
              { resultCd: cd },
              null, startedAt, durationMs,
            );
            return json({
              ok: true,
              message: "This device is already installed at ZRA — the connection is working.",
              sdc_id: settings.sdc_id ?? null,
              mrc_no: settings.mrc_no ?? null,
            });
          }
          const msg = "ZRA says this device is already installed, but it was not installed through Doc'O Clock, so its ZRA device ID is not on record. Ask ZRA to reset the device, then initialise it here.";
          await admin.from("institution_smart_invoice_settings").update({
            last_health_check_at: nowIso, last_test_at: nowIso,
            last_test_ok: false, last_error: msg,
          }).eq("institution_id", institutionId);
          await logOp("initialize", "error",
            { tpin: settings.tpin, bhfId: settings.bhf_id, base_url: baseUrl },
            { resultCd: cd }, msg, startedAt, durationMs);
          return json({ ok: false, error: msg });
        }

        const msg = plainResultMessage(cd, envelope.resultMsg);
        const nowIso = new Date().toISOString();
        await admin.from("institution_smart_invoice_settings").update({
          last_health_check_at: nowIso, last_test_at: nowIso,
          last_test_ok: false, last_error: msg,
        }).eq("institution_id", institutionId);
        await logOp(
          action === "initialize" ? "initialize" : "test_connection",
          "error",
          { tpin: settings.tpin, bhfId: settings.bhf_id, base_url: baseUrl },
          { resultCd: cd },
          msg, startedAt, durationMs,
        );
        return json({ ok: false, error: msg });
      } catch (err) {
        const msg = err instanceof ZraError
          ? err.message
          : "We could not reach the ZRA controller at that address. Check that the address is correct and that the controller is reachable over the internet, then try again.";
        const nowIso = new Date().toISOString();
        await admin.from("institution_smart_invoice_settings").update({
          last_health_check_at: nowIso, last_test_at: nowIso,
          last_test_ok: false, last_error: msg,
        }).eq("institution_id", institutionId);
        await logOp(
          action === "initialize" ? "initialize" : "test_connection",
          "error",
          { tpin: settings.tpin, bhfId: settings.bhf_id, base_url: baseUrl },
          null, msg, startedAt, Date.now() - startedMs,
        );
        return json({ ok: false, error: msg });
      }
    }

    return json({ ok: false, error: "That action is not available." }, 400);
  } catch (err) {
    console.error("zra-connection error:", err);
    return json(
      { ok: false, error: "Something went wrong while managing the ZRA connection. Please try again." },
      500,
    );
  }
});
