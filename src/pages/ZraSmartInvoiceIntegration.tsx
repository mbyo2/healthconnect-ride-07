import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, CheckCircle, RefreshCw, Settings, Clock, Building2,
  Plus, Edit, Link2, Server, Activity, ShieldCheck, Play, Info,
  Zap, Database, Landmark, Loader2, PlugZap,
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { friendlyErrorMessage } from "@/utils/friendly-error";

// ZRA tax bands (spec section 6.1) — display labels only. All tax
// computation happens on the server when a declaration is built.
const ZRA_BANDS = [
  { code: "A", name: "Standard Rated — 16%" },
  { code: "B", name: "Minimum Taxable Value — 16%" },
  { code: "C1", name: "Exports — 0%" },
  { code: "C2", name: "Zero-rating (Local Purchase Order) — 0%" },
  { code: "C3", name: "Zero-rated by nature — 0%" },
  { code: "D", name: "Exempt — 0%" },
  { code: "RVAT", name: "Reverse VAT — 16%" },
  { code: "E", name: "Disbursement — 0%" },
  { code: "F", name: "Service Charge — 10%" },
  { code: "IPL1", name: "Insurance Premium Levy — 5%" },
  { code: "IPL2", name: "Re-Insurance Premium Levy — 0%" },
  { code: "TL", name: "Tourism Levy — 1.5%" },
  { code: "ECM", name: "Excise on Coal — 5%" },
  { code: "EXEEG", name: "Excise Electricity — 3%" },
  { code: "TOT", name: "Turnover Tax" },
];

interface ConnStatus {
  connected: boolean;
  status: string;
  controller_type: string;
  environment: string;
  tpin?: string;
  bhf_id?: string;
  device_serial_masked?: string | null;
  has_device_serial?: boolean;
  legal_business_name?: string;
  authorized_contact_email?: string;
  authorized_contact_phone?: string;
  vsdc_base_url?: string;
  sdc_id?: string | null;
  mrc_no?: string | null;
  taxpayer_name?: string | null;
  initialized_at?: string | null;
  last_health_check_at?: string | null;
  last_test_at?: string | null;
  last_test_ok?: boolean | null;
  last_error?: string | null;
}

interface SubmissionRow {
  id: string;
  kind: string;
  status: string;
  attempt_count: number;
  zra_invoice_number?: string | null;
  sdc_id?: string | null;
  last_error?: string | null;
  next_retry_at?: string | null;
  accepted_at?: string | null;
  created_at: string;
  invoice_number?: string;
  total_amount?: number;
}

interface ItemMapping {
  id: string;
  catalog_item_id: string;
  zra_item_code: string;
  zra_item_class_code?: string | null;
  tax_type_code?: string | null;
  synced_at?: string | null;
  is_active: boolean;
}

interface OpLog {
  id: string;
  operation_type: string;
  operation_status: string;
  error_message?: string | null;
  started_at: string;
  duration_ms?: number | null;
}

/** Invoke a ZRA edge function and unwrap its { ok, error, ... } body —
 *  including bodies returned with a 4xx status, which carry the
 *  plain-language refusal. */
async function callZraFunction(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let payload: any = null;
    try {
      payload = await (error as any).context?.json();
    } catch { /* body unreadable — fall through to the generic message */ }
    if (payload && typeof payload.error === "string") {
      return { ok: false, error: payload.error, ...payload };
    }
    return { ok: false, error: friendlyErrorMessage(error, "The request could not be completed. Please try again.") };
  }
  return data as any;
}

function humanStatus(status: string, nextRetryAt?: string | null): { label: string; cls: string } {
  switch (status) {
    case "sent": return { label: "Declared", cls: "bg-success-700 text-white" };
    case "queued": return { label: "Awaiting declaration", cls: "bg-warning-700 text-white" };
    case "sending": return { label: "Declaring…", cls: "bg-primary-500 text-white" };
    case "failed":
      return nextRetryAt
        ? { label: "Failed — will retry automatically", cls: "bg-error-700 text-white" }
        : { label: "Failed — needs attention", cls: "bg-error-700 text-white" };
    default: return { label: status, cls: "bg-muted-foreground text-white" };
  }
}

export const ZraSmartInvoiceIntegration = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [conn, setConn] = useState<ConnStatus | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [itemMappings, setItemMappings] = useState<ItemMapping[]>([]);
  const [operationLogs, setOperationLogs] = useState<OpLog[]>([]);
  const [taxTemplates, setTaxTemplates] = useState<{ id: string; name: string; rate_percent: number }[]>([]);
  const [taxMappings, setTaxMappings] = useState<Record<string, string>>({});
  const [services, setServices] = useState<{ id: string; service_label: string; service_code: string }[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [configForm, setConfigForm] = useState({
    environment: "sandbox",
    controller_type: "vsdc",
    tpin: "",
    bhf_id: "000",
    device_serial_number: "",
    legal_business_name: "",
    authorized_contact_email: "",
    authorized_contact_phone: "",
    vsdc_base_url: "",
  });

  const [mappingForm, setMappingForm] = useState({
    catalog_item_id: "",
    tax_type_code: "",
    zra_item_class_code: "",
  });

  // ZAMBIA-ONLY (CEO rule, 2026-11-21): this whole surface is absent
  // for institutions outside Zambia — the route simply leaves.
  const isZambia = (institution as any)?.country_code === "ZM";

  useEffect(() => {
    if (institution && isZambia) {
      void fetchAll();
    } else if (institution) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution?.id, isZambia]);

  const fetchAll = async () => {
    if (!institution) return;
    setLoading(true);
    try {
      const [statusRes, subsRes, mappingsRes, logsRes, templatesRes, taxMapRes, servicesRes] = await Promise.all([
        callZraFunction("zra-connection", { action: "status", institution_id: institution.id }),
        supabase.from("fiscal_submissions").select("*").eq("institution_id", institution.id).not("billing_invoice_id", "is", null).order("created_at", { ascending: false }).limit(50),
        supabase.from("institution_zra_item_mappings").select("*").eq("institution_id", institution.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("vsdc_operation_logs").select("*").eq("institution_id", institution.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("tax_templates").select("id, name, rate_percent").eq("institution_id", institution.id).eq("is_active", true),
        supabase.from("institution_zra_tax_mappings").select("doc_rate_percent, zra_tax_label").eq("institution_id", institution.id),
        supabase.from("service_pricing").select("id, service_label, service_code").eq("institution_id", institution.id).eq("is_active", true).limit(200),
      ]);

      if (statusRes?.ok) {
        setConn(statusRes as ConnStatus);
        setConfigForm((f) => ({
          ...f,
          environment: statusRes.environment || "sandbox",
          controller_type: statusRes.controller_type || "vsdc",
          tpin: statusRes.tpin || "",
          bhf_id: statusRes.bhf_id || "000",
          device_serial_number: "",
          legal_business_name: statusRes.legal_business_name || "",
          authorized_contact_email: statusRes.authorized_contact_email || "",
          authorized_contact_phone: statusRes.authorized_contact_phone || "",
          vsdc_base_url: statusRes.vsdc_base_url || "",
        }));
      }

      const subs = (subsRes.data as any[]) || [];
      if (subs.length > 0) {
        const invIds = [...new Set(subs.map((s) => s.billing_invoice_id))];
        const { data: invs } = await supabase
          .from("billing_invoices")
          .select("id, invoice_number, total_amount")
          .in("id", invIds);
        const invById = new Map((invs || []).map((i: any) => [i.id, i]));
        setSubmissions(subs.map((s) => ({
          ...s,
          invoice_number: invById.get(s.billing_invoice_id)?.invoice_number,
          total_amount: invById.get(s.billing_invoice_id)?.total_amount,
        })));
      } else {
        setSubmissions([]);
      }

      if (mappingsRes.data) setItemMappings(mappingsRes.data as ItemMapping[]);
      if (logsRes.data) setOperationLogs(logsRes.data as OpLog[]);
      if (templatesRes.data) setTaxTemplates(templatesRes.data as any);
      if (taxMapRes.data) {
        const map: Record<string, string> = {};
        for (const row of taxMapRes.data as any[]) {
          map[String(Number(row.doc_rate_percent))] = row.zra_tax_label;
        }
        setTaxMappings(map);
      }
      if (servicesRes.data) setServices(servicesRes.data as any);
    } catch (error) {
      console.error("Error fetching ZRA data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!institution) return;
    setBusy("save");
    try {
      const res = await callZraFunction("zra-connection", {
        action: "save",
        institution_id: institution.id,
        ...configForm,
      });
      if (!res?.ok) {
        toast.error(res?.error || "The connection details could not be saved.");
        return;
      }
      toast.success("Connection details saved.");
      setShowConfigDialog(false);
      await fetchAll();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "The connection details could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  const handleInitialize = async () => {
    if (!institution) return;
    setBusy("init");
    try {
      const res = await callZraFunction("zra-connection", {
        action: "initialize",
        institution_id: institution.id,
      });
      if (!res?.ok) {
        toast.error(res?.error || "Initialisation did not complete.");
      } else {
        toast.success(res.message || "Device initialised.");
        if (res.backfilled > 0) {
          toast.info(`${res.backfilled} recently paid invoice(s) were queued for declaration.`);
        }
      }
      await fetchAll();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Initialisation did not complete."));
    } finally {
      setBusy(null);
    }
  };

  const handleTestConnection = async () => {
    if (!institution) return;
    setBusy("test");
    try {
      const res = await callZraFunction("zra-connection", {
        action: "test",
        institution_id: institution.id,
      });
      if (!res?.ok) toast.error(res?.error || "The test did not pass.");
      else toast.success(res.message || "The ZRA controller answered.");
      await fetchAll();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "The test did not complete."));
    } finally {
      setBusy(null);
    }
  };

  const handleProcessDeclarations = async (submissionId?: string) => {
    if (!institution) return;
    setBusy(submissionId ? `retry-${submissionId}` : "process");
    try {
      const res = await callZraFunction("zra-declare", {
        institution_id: institution.id,
        ...(submissionId ? { submission_id: submissionId } : {}),
      });
      if (!res?.ok) {
        toast.error(res?.error || "Declarations could not be processed.");
      } else if (Array.isArray(res.processed) && res.processed.length > 0) {
        const sent = res.processed.filter((p: any) => p.status === "sent").length;
        const failed = res.processed.length - sent;
        if (sent > 0) toast.success(`${sent} declaration(s) accepted by ZRA.`);
        if (failed > 0) toast.error(`${failed} declaration(s) could not be sent — they will keep retrying automatically.`);
      } else {
        toast.info("No declarations are waiting right now.");
      }
      await fetchAll();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Declarations could not be processed."));
    } finally {
      setBusy(null);
    }
  };

  const handleSaveTaxMapping = async (rate: number, band: string) => {
    if (!institution) return;
    setBusy(`tax-${rate}`);
    try {
      const { error } = await supabase.from("institution_zra_tax_mappings").upsert(
        { institution_id: institution.id, doc_rate_percent: rate, zra_tax_label: band, updated_at: new Date().toISOString() },
        { onConflict: "institution_id,doc_rate_percent" },
      );
      if (error) throw error;
      setTaxMappings((m) => ({ ...m, [String(rate)]: band }));
      toast.success(`Invoices taxed at ${rate}% will be declared under ZRA band ${band}.`);
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "The tax mapping could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  const handleAddItemMapping = async () => {
    if (!institution || !mappingForm.catalog_item_id) return;
    setBusy("mapping");
    try {
      // Item codes follow the ZRA format (spec 6.16): ZM + type 3
      // (service) + units + serial. The declaration worker registers
      // the item with ZRA on first use and reuses this code.
      const serial = itemMappings.length + 1;
      const code = `ZM3EAU${String(serial).padStart(7, "0")}`;
      const svc = services.find((s) => s.id === mappingForm.catalog_item_id);
      const { error } = await supabase.from("institution_zra_item_mappings").insert({
        institution_id: institution.id,
        catalog_item_id: mappingForm.catalog_item_id,
        zra_item_code: code,
        zra_item_class_code: mappingForm.zra_item_class_code || null,
        tax_type_code: mappingForm.tax_type_code || null,
        quantity_unit_code: "U",
        package_unit_code: "EA",
        default_price: null,
        is_active: true,
      });
      if (error) throw error;
      toast.success(`Mapping saved for ${svc?.service_label || "the service"} — it will be registered with ZRA at its first declaration.`);
      setShowMappingDialog(false);
      setMappingForm({ catalog_item_id: "", tax_type_code: "", zra_item_class_code: "" });
      await fetchAll();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "The item mapping could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  if (institution && !isZambia) {
    return <Navigate to="/institution-portal" replace />;
  }

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-primary-500" />
            <h2 className="text-xl font-semibold">Institution Required</h2>
            <p className="text-xs text-muted-foreground">Please select an institution to access ZRA Smart Invoice integration.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-gold hover:bg-gold-deep text-gold-ink">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const declaredCount = submissions.filter((s) => s.status === "sent").length;
  const awaitingCount = submissions.filter((s) => ["queued", "sending", "failed"].includes(s.status)).length;

  // Rates the mapping editor covers: the institution's tax template
  // rates, plus the two Zambian standard rates as defaults.
  const editorRates = [...new Set([16, 0, ...taxTemplates.map((t) => Number(t.rate_percent))])]
    .sort((a, b) => b - a);

  const connectionBadge = conn?.connected
    ? { label: conn.environment === "production" ? "Connected — Production" : "Connected — Test", cls: "bg-success-700 text-white" }
    : conn?.status === "pending_setup"
      ? { label: "Details saved — device not initialised", cls: "bg-warning-700 text-white" }
      : { label: "Not connected", cls: "bg-muted-foreground text-white" };

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">ZRA Smart Invoice</h1>
              <p className="text-xs text-muted-foreground font-medium truncate">Declare this institution's invoices to the Zambia Revenue Authority</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold-deep text-gold-ink font-semibold text-xs flex items-center gap-2">
                  <Settings className="h-4 w-4" /> {conn?.connected || conn?.status === "pending_setup" ? "Edit connection" : "Connect to ZRA"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Connect to ZRA Smart Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 rounded-lg bg-muted text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary-500" />
                      <span className="font-semibold">Before you start</span>
                    </div>
                    <p className="text-muted-foreground">
                      Register on the ZRA Smart Invoice taxpayer portal and apply for a virtual
                      fiscal device. ZRA issues your TPIN's branch (BHF ID) and a device serial
                      number — enter them exactly as issued.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">VSDC or OSDC?</span> With an{" "}
                      <span className="font-semibold text-foreground">OSDC</span>, ZRA hosts the
                      controller — enter the address ZRA gave you. With a{" "}
                      <span className="font-semibold text-foreground">VSDC</span>, the controller
                      runs on your own server. Doc'O Clock works in the cloud, so that address
                      must be reachable over the internet — a private network address (like
                      192.168.x.x) cannot be reached. Ask your IT team to publish the VSDC at a
                      public address, for example https://vsdc.yourfacility.org.zm.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Controller type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {([
                        { v: "osdc", t: "OSDC", d: "Hosted by ZRA" },
                        { v: "vsdc", t: "VSDC", d: "Runs on your server" },
                      ] as const).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setConfigForm({ ...configForm, controller_type: o.v })}
                          className={`rounded-lg border p-3 text-left ${configForm.controller_type === o.v ? "border-primary-500 bg-primary-500/5" : "border-border"}`}
                        >
                          <div className="text-sm font-semibold">{o.t}</div>
                          <div className="text-xs text-muted-foreground">{o.d}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Environment</Label>
                    <Select value={configForm.environment} onValueChange={(v) => setConfigForm({ ...configForm, environment: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Test (Sandbox) — practise with ZRA's test system</SelectItem>
                        <SelectItem value="production">Production — real declarations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">TPIN (Tax Payer Identification Number)</Label>
                    <Input value={configForm.tpin} onChange={(e) => setConfigForm({ ...configForm, tpin: e.target.value })} placeholder="10 digits, e.g. 1001234567" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Branch ID (BHF ID)</Label>
                      <Input value={configForm.bhf_id} onChange={(e) => setConfigForm({ ...configForm, bhf_id: e.target.value })} placeholder="000" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Device Serial Number</Label>
                      <Input
                        value={configForm.device_serial_number}
                        onChange={(e) => setConfigForm({ ...configForm, device_serial_number: e.target.value })}
                        placeholder={conn?.has_device_serial ? `Current: ${conn.device_serial_masked} — blank keeps it` : "As issued by ZRA"}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Legal Business Name</Label>
                    <Input value={configForm.legal_business_name} onChange={(e) => setConfigForm({ ...configForm, legal_business_name: e.target.value })} placeholder="Registered business name" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Contact Email</Label>
                      <Input type="email" value={configForm.authorized_contact_email} onChange={(e) => setConfigForm({ ...configForm, authorized_contact_email: e.target.value })} placeholder="finance@facility.co.zm" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Contact Phone</Label>
                      <Input value={configForm.authorized_contact_phone} onChange={(e) => setConfigForm({ ...configForm, authorized_contact_phone: e.target.value })} placeholder="+260…" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">
                      {configForm.controller_type === "osdc" ? "OSDC address (issued by ZRA)" : "VSDC public address"}
                    </Label>
                    <Input value={configForm.vsdc_base_url} onChange={(e) => setConfigForm({ ...configForm, vsdc_base_url: e.target.value })} placeholder={configForm.controller_type === "osdc" ? "The controller address from ZRA" : "https://vsdc.yourfacility.org.zm"} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {configForm.environment === "sandbox"
                        ? "In the Test environment you can leave this blank to use ZRA's sandbox controller."
                        : "Required in Production — this is where declarations are sent."}
                    </p>
                  </div>

                  <Button onClick={handleSaveConfig} disabled={busy === "save"} className="w-full bg-gold hover:bg-gold-deep text-gold-ink font-semibold">
                    {busy === "save" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save connection details
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Connection</span>
                <ShieldCheck className="h-4 w-4 text-primary-500" />
              </div>
              <Badge className={connectionBadge.cls + " text-xs"}>{connectionBadge.label}</Badge>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">
                {conn?.connected ? `${(conn.controller_type || "vsdc").toUpperCase()} · SDC ${conn.sdc_id || ""}` : "No device linked yet"}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Declared invoices</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{declaredCount}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Accepted by ZRA</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Awaiting / retrying</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{awaitingCount}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Sent automatically when possible</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Item mappings</span>
                <Database className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{itemMappings.length}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Services known to ZRA</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-card border border-border p-1 flex-wrap h-auto">
            <TabsTrigger value="dashboard"><Activity className="h-4 w-4 mr-2" /> Connection</TabsTrigger>
            <TabsTrigger value="submissions"><FileText className="h-4 w-4 mr-2" /> Declarations</TabsTrigger>
            <TabsTrigger value="tax"><Landmark className="h-4 w-4 mr-2" /> Tax Mapping</TabsTrigger>
            <TabsTrigger value="mappings"><Database className="h-4 w-4 mr-2" /> Item Mappings</TabsTrigger>
            <TabsTrigger value="logs"><Server className="h-4 w-4 mr-2" /> Device Logs</TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {conn && (conn.connected || conn.status === "pending_setup") ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary-500" /> Device actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!conn.connected && (
                      <Button onClick={handleInitialize} disabled={busy === "init"} className="w-full bg-gold hover:bg-gold-deep text-gold-ink font-semibold text-xs">
                        {busy === "init" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                        Initialise device with ZRA
                      </Button>
                    )}
                    <Button onClick={handleTestConnection} disabled={busy === "test"} variant="outline" className="w-full text-xs">
                      {busy === "test" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlugZap className="h-4 w-4 mr-1" />}
                      Test connection
                    </Button>
                    <Button onClick={() => handleProcessDeclarations()} disabled={busy === "process"} variant="outline" className="w-full text-xs">
                      {busy === "process" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Send waiting declarations now
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Paid invoices are declared automatically — you do not need to send them
                      one by one. Declarations retry on their own when ZRA cannot be reached.
                    </p>
                    {conn.last_error && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs">
                        <span className="font-semibold">Last problem: </span>{conn.last_error}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary-500" /> Device on record
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      ["TPIN", conn.tpin || "Not set"],
                      ["Branch ID", conn.bhf_id || "000"],
                      ["Device serial", conn.device_serial_masked || "Not set"],
                      ["Controller", (conn.controller_type || "vsdc").toUpperCase()],
                      ["Environment", conn.environment === "production" ? "Production" : "Test (Sandbox)"],
                      ["Taxpayer (from ZRA)", conn.taxpayer_name || "—"],
                      ["ZRA device ID (SDC)", conn.sdc_id || "Not initialised"],
                      ["MRC number", conn.mrc_no || "—"],
                      ["Initialised", conn.initialized_at ? new Date(conn.initialized_at).toLocaleString() : "No"],
                      ["Last connection test", conn.last_test_at ? `${new Date(conn.last_test_at).toLocaleString()} — ${conn.last_test_ok ? "passed" : "did not pass"}` : "Never"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs gap-3">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-semibold text-right">{v}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-primary-500 mb-4" />
                  <h3 className="text-sm font-semibold mb-2">Not connected to ZRA Smart Invoice yet</h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-lg mx-auto">
                    Connect this institution's ZRA virtual fiscal device and every paid invoice
                    will be declared to the Zambia Revenue Authority automatically — with the
                    fiscal receipt details printed on the patient's receipt.
                  </p>
                  <Button onClick={() => setShowConfigDialog(true)} className="bg-gold hover:bg-gold-deep text-gold-ink">
                    Connect to ZRA
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Declarations Tab */}
          <TabsContent value="submissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Invoice declarations</h3>
              <Button variant="outline" size="sm" className="text-xs min-h-[44px]" onClick={() => handleProcessDeclarations()} disabled={busy === "process"}>
                {busy === "process" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Send waiting declarations now
              </Button>
            </div>
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[720px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Invoice #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Type</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Attempts</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">ZRA receipt #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Declared</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => {
                    const st = humanStatus(s.status, s.next_retry_at);
                    return (
                      <tr key={s.id} className="border-t border-border hover:bg-canvas-bone">
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold">{s.invoice_number || "—"}</div>
                          {s.last_error && s.status !== "sent" && (
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">{s.last_error}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">{s.kind === "credit_note" ? "Credit note" : "Sale"}</td>
                        <td className="px-4 py-3 text-sm text-right tnum font-medium">
                          {institution.currency || "ZMW"} {Number(s.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3"><Badge className={st.cls + " text-xs"}>{st.label}</Badge></td>
                        <td className="px-4 py-3 text-xs text-right">{s.attempt_count}</td>
                        <td className="px-4 py-3 text-xs">{s.zra_invoice_number || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.accepted_at ? new Date(s.accepted_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {(s.status === "failed" || s.status === "queued") && (
                            <Button variant="ghost" size="sm" className="min-h-[44px] text-xs" disabled={busy === `retry-${s.id}`} onClick={() => handleProcessDeclarations(s.id)}>
                              {busy === `retry-${s.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                              Retry now
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="space-y-3">
                          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm font-semibold">No declarations yet</p>
                          <p className="text-xs text-muted-foreground">Once the device is initialised, paid invoices are declared automatically and appear here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </Card>
          </TabsContent>

          {/* Tax Mapping Tab */}
          <TabsContent value="tax" className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-primary-500" />
                <span className="font-semibold">How tax mapping works</span>
              </div>
              <p className="text-muted-foreground">
                Each service on your price list carries a tax template. When an invoice is
                declared, the server matches the template's rate to the ZRA tax band below —
                the mapping is applied on the server only, never in the browser. Defaults:
                16% declares as Standard Rated, 0% as Exempt.
              </p>
            </div>
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[560px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Doc'O Clock tax rate</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Used by</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">ZRA tax band</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {editorRates.map((rate) => {
                    const usedBy = taxTemplates.filter((t) => Number(t.rate_percent) === rate).map((t) => t.name);
                    const current = taxMappings[String(rate)] || (rate > 0 ? "A" : "D");
                    return (
                      <TaxMappingRow
                        key={rate}
                        rate={rate}
                        usedBy={usedBy}
                        current={current}
                        isDefault={!taxMappings[String(rate)]}
                        busy={busy === `tax-${rate}`}
                        onSave={(band) => handleSaveTaxMapping(rate, band)}
                      />
                    );
                  })}
                </tbody>
              </table></div>
            </Card>
          </TabsContent>

          {/* Item Mappings Tab */}
          <TabsContent value="mappings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">ZRA item mappings</h3>
              <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                    <Plus className="h-4 w-4 mr-1" /> Add mapping
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Map a service to a ZRA item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <p className="text-xs text-muted-foreground">
                      Services without a mapping are registered with ZRA automatically at their
                      first declaration. Add a mapping only when you need a specific ZRA item
                      class or tax band for a service.
                    </p>
                    <div>
                      <Label className="text-xs font-semibold">Service (from your price list)</Label>
                      <Select value={mappingForm.catalog_item_id} onValueChange={(v) => setMappingForm({ ...mappingForm, catalog_item_id: v })}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a service" /></SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.service_label} ({s.service_code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">ZRA tax band (optional override)</Label>
                      <Select value={mappingForm.tax_type_code || "auto"} onValueChange={(v) => setMappingForm({ ...mappingForm, tax_type_code: v === "auto" ? "" : v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Automatic — from the tax mapping</SelectItem>
                          {ZRA_BANDS.map((b) => (
                            <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">ZRA item class code (optional)</Label>
                      <Input value={mappingForm.zra_item_class_code} onChange={(e) => setMappingForm({ ...mappingForm, zra_item_class_code: e.target.value })} placeholder="UNSPSC class code" className="mt-1" />
                    </div>
                    <Button onClick={handleAddItemMapping} disabled={busy === "mapping" || !mappingForm.catalog_item_id} className="w-full bg-gold hover:bg-gold-deep text-gold-ink font-semibold">
                      {busy === "mapping" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save mapping
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {itemMappings.length === 0 && (
              <Card className="border-border">
                <CardContent className="p-12 text-center space-y-3">
                  <Link2 className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm font-semibold">No item mappings yet</p>
                  <p className="text-xs text-muted-foreground">That is fine — services are registered with ZRA automatically at their first declaration. Mappings appear here as declarations happen.</p>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemMappings.map((mapping) => {
                const svc = services.find((s) => s.id === mapping.catalog_item_id);
                return (
                  <Card key={mapping.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold">{svc?.service_label || mapping.zra_item_code}</CardTitle>
                          <div className="text-xs text-muted-foreground">ZRA item code: {mapping.zra_item_code}</div>
                        </div>
                        {mapping.synced_at ? (
                          <Badge className="bg-success-700 text-white text-xs">Registered with ZRA</Badge>
                        ) : (
                          <Badge className="bg-warning-700 text-white text-xs">Registers at first declaration</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Item class</span>
                        <span className="font-semibold">{mapping.zra_item_class_code || "Default (services)"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tax band override</span>
                        <span className="font-semibold">{mapping.tax_type_code || "Automatic"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Registered</span>
                        <span className="font-semibold">{mapping.synced_at ? new Date(mapping.synced_at).toLocaleDateString() : "Not yet"}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <h3 className="text-sm font-semibold">Device operation logs</h3>
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Operation</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Result</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Detail</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Duration</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {operationLogs.map((log) => (
                    <tr key={log.id} className="border-t border-border hover:bg-canvas-bone">
                      <td className="px-4 py-3"><div className="text-xs font-semibold">{log.operation_type}</div></td>
                      <td className="px-4 py-3">
                        <Badge className={(log.operation_status === "success" ? "bg-success-700" : "bg-error-700") + " text-white text-xs"}>
                          {log.operation_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px]">{log.error_message || "—"}</td>
                      <td className="px-4 py-3 text-xs text-right">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.started_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {operationLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="space-y-3">
                          <Activity className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm font-semibold">No operations logged yet</p>
                          <p className="text-xs text-muted-foreground">Initialisation, connection tests and declarations will be recorded here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function TaxMappingRow({ rate, usedBy, current, isDefault, busy, onSave }: {
  rate: number;
  usedBy: string[];
  current: string;
  isDefault: boolean;
  busy: boolean;
  onSave: (band: string) => void;
}) {
  const [band, setBand] = useState(current);
  useEffect(() => { setBand(current); }, [current]);
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 text-sm font-semibold">{rate}%</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{usedBy.length > 0 ? usedBy.join(", ") : "Standard rate"}</td>
      <td className="px-4 py-3">
        <Select value={band} onValueChange={setBand}>
          <SelectTrigger className="w-[280px] max-w-full h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ZRA_BANDS.map((b) => (
              <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDefault && <div className="text-xs text-muted-foreground mt-1">Platform default</div>}
      </td>
      <td className="px-4 py-3">
        <Button size="sm" variant="outline" className="text-xs min-h-[36px]" disabled={busy || band === current} onClick={() => onSave(band)}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit className="h-3 w-3 mr-1" />}
          Save
        </Button>
      </td>
    </tr>
  );
}

export default ZraSmartInvoiceIntegration;
