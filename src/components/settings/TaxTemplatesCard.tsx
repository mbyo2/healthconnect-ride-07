/**
 * TaxTemplatesCard — saved tax templates per facility, and per drug /
 * service assignment. Billing RPCs (create_pharmacy_sale, create_pos_sale,
 * create_hospital_bill) resolve each line's rate server-side from these.
 */
// @ts-nocheck — new tables not yet in generated Supabase types
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Percent, Plus, Save, Trash2 } from "lucide-react";
import { friendlyErrorMessage } from "@/utils/friendly-error";

type Template = { id: string; name: string; rate_percent: number; description: string | null; is_default: boolean; is_active: boolean };
type Item = { id: string; name: string; price: number | null; tax_template_id: string | null };

const SOURCES = {
  services: { table: "service_pricing", scope: "institution_id", name: "service_label", price: "base_price", label: "Services" },
  pharmacy: { table: "pharmacy_inventory", scope: "pharmacy_id", name: "product_name", price: "unit_price", label: "Pharmacy drugs" },
  dispensary: { table: "medication_inventory", scope: "institution_id", name: "medication_name", price: "unit_price", label: "Dispensary drugs" },
} as const;
type SourceKey = keyof typeof SOURCES;
const DEFAULT = "__default__";

const PRESETS = [
  { name: "Standard VAT", rate_percent: 16 },
  { name: "Zero-rated", rate_percent: 0 },
  { name: "Exempt", rate_percent: 0 },
];

export default function TaxTemplatesCard({ institutionId }: { institutionId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", rate_percent: "", description: "", is_default: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("tax_templates").select("*").eq("institution_id", institutionId).order("name");
    if (error) toast.error(friendlyErrorMessage(error));
    setTemplates(data || []);
    setLoading(false);
  }, [institutionId]);
  useEffect(() => { load(); }, [load]);

  const save = async (t: Partial<Template> & { name: string; rate_percent: number }) => {
    setSaving(true);
    try {
      if (t.is_default) {
        await supabase.from("tax_templates").update({ is_default: false }).eq("institution_id", institutionId).eq("is_default", true);
      }
      const { error } = t.id
        ? await supabase.from("tax_templates").update(t).eq("id", t.id)
        : await supabase.from("tax_templates").insert({ ...t, institution_id: institutionId });
      if (error) throw error;
      toast.success("Tax template saved");
      await load();
      return true;
    } catch (e) {
      toast.error(friendlyErrorMessage(e));
      return false;
    } finally { setSaving(false); }
  };

  const add = async () => {
    const rate = Number(form.rate_percent);
    if (!form.name.trim()) return toast.error("Give the template a name.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return toast.error("Rate must be between 0 and 100.");
    if (await save({ name: form.name.trim(), rate_percent: rate, description: form.description || null, is_default: form.is_default })) {
      setForm({ name: "", rate_percent: "", description: "", is_default: false });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template? Items using it will fall back to the default.")) return;
    const { error } = await supabase.from("tax_templates").delete().eq("id", id);
    if (error) return toast.error(friendlyErrorMessage(error));
    toast.success("Template deleted");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Tax templates</CardTitle>
        <CardDescription>
          Save tax rates once, then choose one per service or drug. Items without a choice use your default template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
          <div className="space-y-2">
            {templates.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-2">
                <p>No templates yet. Start from a common one:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p, i) => (
                    <Button key={p.name} size="sm" variant="outline" disabled={saving}
                      onClick={() => save({ ...p, is_default: i === 0 })}>
                      {p.name} ({p.rate_percent}%)
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {templates.map((t) => (
              <TemplateRow key={t.id} t={t} saving={saving} onSave={save} onDelete={() => remove(t.id)} />
            ))}
          </div>
        )}

        <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-[2fr_1fr_2fr_auto_auto] sm:items-end">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard VAT" /></div>
          <div><Label>Rate %</Label><Input type="number" min={0} max={100} step="0.01" value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} /></div>
          <div><Label>Note</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
          <div className="flex items-center gap-2 pb-2"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><span className="text-sm">Default</span></div>
          <Button onClick={add} disabled={saving}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>

        {templates.length > 0 && <ItemAssignments institutionId={institutionId} templates={templates.filter((t) => t.is_active)} />}
      </CardContent>
    </Card>
  );
}

function TemplateRow({ t, saving, onSave, onDelete }: { t: Template; saving: boolean; onSave: (t: any) => Promise<boolean>; onDelete: () => void }) {
  const [rate, setRate] = useState(String(t.rate_percent));
  const [name, setName] = useState(t.name);
  const dirty = rate !== String(t.rate_percent) || name !== t.name;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} />
      <Input className="w-24" type="number" min={0} max={100} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
      <span className="text-sm text-muted-foreground">%</span>
      {t.is_default ? <Badge>Default</Badge> : (
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => onSave({ id: t.id, name: t.name, rate_percent: t.rate_percent, is_default: true })}>Make default</Button>
      )}
      <div className="flex items-center gap-1">
        <Switch checked={t.is_active} onCheckedChange={(v) => onSave({ id: t.id, name: t.name, rate_percent: t.rate_percent, is_active: v })} />
        <span className="text-xs text-muted-foreground">Active</span>
      </div>
      <div className="ml-auto flex gap-1">
        {dirty && <Button size="sm" disabled={saving} onClick={() => onSave({ id: t.id, name: name.trim(), rate_percent: Number(rate) })}><Save className="h-4 w-4" /></Button>}
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete template"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
}

function ItemAssignments({ institutionId, templates }: { institutionId: string; templates: Template[] }) {
  const [source, setSource] = useState<SourceKey>("services");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cfg = SOURCES[source];
    setLoading(true);
    supabase.from(cfg.table).select(`id, ${cfg.name}, ${cfg.price}, tax_template_id`).eq(cfg.scope, institutionId).order(cfg.name).limit(1000)
      .then(({ data, error }) => {
        if (error) toast.error(friendlyErrorMessage(error));
        setItems((data || []).map((r: any) => ({ id: r.id, name: r[cfg.name] || "Unnamed", price: r[cfg.price], tax_template_id: r.tax_template_id })));
        setLoading(false);
      });
  }, [source, institutionId]);

  const filtered = useMemo(() => items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const assign = async (ids: string[], value: string) => {
    const tax_template_id = value === DEFAULT ? null : value;
    const { error } = await supabase.from(SOURCES[source].table).update({ tax_template_id }).in("id", ids);
    if (error) return toast.error(friendlyErrorMessage(error));
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, tax_template_id } : i)));
    toast.success(ids.length > 1 ? `Tax set on ${ids.length} items` : "Tax updated");
  };

  const picker = (value: string | null, onChange: (v: string) => void, placeholder = "Default") => (
    <Select value={value ?? DEFAULT} onValueChange={onChange}>
      <SelectTrigger className="w-48"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT}>Use default</SelectItem>
        {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate_percent}%)</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Tax per service or drug</h4>
      <Tabs value={source} onValueChange={(v) => setSource(v as SourceKey)}>
        <TabsList>{Object.entries(SOURCES).map(([k, c]) => <TabsTrigger key={k} value={k}>{c.label}</TabsTrigger>)}</TabsList>
        <TabsContent value={source} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="max-w-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {filtered.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Apply to all {filtered.length} shown:
                {picker(null, (v) => assign(filtered.map((i) => i.id), v), "Choose…")}
              </div>
            )}
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here yet — add items to your {SOURCES[source].label.toLowerCase()} list first.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y rounded-md border">
              {filtered.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    {i.price != null && <p className="text-xs text-muted-foreground">Price {Number(i.price).toFixed(2)}</p>}
                  </div>
                  {picker(i.tax_template_id, (v) => assign([i.id], v))}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
