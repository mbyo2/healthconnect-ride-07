import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tag, RefreshCw, Save, Calculator } from "lucide-react";

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  target_audience: string;
  price_monthly: number;
  price_annual: number;
  is_active: boolean;
  sort_order: number;
}

interface Draft {
  monthly: string;
  annual: string;
  is_active: boolean;
}

const formatKwacha = (amount: number) => {
  if (!amount) return "Free";
  return `K${Number(amount).toLocaleString()}`;
};

export function SubscriptionPricingAdmin() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("subscription_plans")
      .select("id, name, slug, target_audience, price_monthly, price_annual, is_active, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Failed to load subscription plans");
    } else {
      const rows = (data || []) as PlanRow[];
      setPlans(rows);
      const next: Record<string, Draft> = {};
      rows.forEach((p) => {
        next[p.id] = {
          monthly: String(p.price_monthly ?? 0),
          annual: String(p.price_annual ?? 0),
          is_active: p.is_active,
        };
      });
      setDrafts(next);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const isDirty = (p: PlanRow) => {
    const d = drafts[p.id];
    if (!d) return false;
    return (
      Number(d.monthly) !== Number(p.price_monthly) ||
      Number(d.annual) !== Number(p.price_annual) ||
      d.is_active !== p.is_active
    );
  };

  const autoAnnual = (p: PlanRow) => {
    const m = Math.max(0, Math.round(Number(drafts[p.id]?.monthly) || 0));
    setDraft(p.id, { monthly: String(m), annual: String(m * 12) });
  };

  const save = async (p: PlanRow) => {
    const d = drafts[p.id];
    const monthly = Math.round(Number(d.monthly));
    const annual = Math.round(Number(d.annual));
    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(annual) || annual < 0) {
      toast.error("Prices must be zero or a positive whole number");
      return;
    }
    setSavingId(p.id);
    const { error } = await (supabase as any)
      .from("subscription_plans")
      .update({
        price_monthly: monthly,
        price_annual: annual,
        is_active: d.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message || "Failed to save pricing");
      return;
    }
    toast.success(`${p.name} pricing updated — live on the pricing page now`);
    setPlans((rows) =>
      rows.map((r) =>
        r.id === p.id
          ? { ...r, price_monthly: monthly, price_annual: annual, is_active: d.is_active }
          : r
      )
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-extrabold text-sm flex items-center gap-2">
          <Tag className="h-4 w-4 text-emerald-500" /> Subscription Pricing
          <Badge variant="secondary" className="text-[10px]">Superadmin only</Badge>
        </h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <p className="text-xs text-graphite-500 dark:text-slate-400 mb-4">
        Edit any plan's monthly and annual Kwacha prices. Saving updates the live pricing page
        immediately — no code deploy needed. Use the ×12 button to set the annual price from the monthly one.
      </p>

      {loading ? (
        <p className="text-sm text-graphite-500 py-6 text-center">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-graphite-500 py-6 text-center">No subscription plans found.</p>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => {
            const d = drafts[p.id];
            if (!d) return null;
            const dirty = isDirty(p);
            return (
              <Card key={p.id} className={`p-4 ${dirty ? "border-amber-400" : ""}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="lg:w-64 shrink-0">
                    <div className="font-bold text-sm text-midnight dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-graphite-500 font-mono">{p.slug}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{p.target_audience}</Badge>
                      {!p.is_active && (
                        <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-graphite-500">
                        Monthly (K)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={d.monthly}
                        onChange={(e) => setDraft(p.id, { monthly: e.target.value })}
                        className="mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-graphite-500">
                        Annual (K)
                      </label>
                      <div className="flex gap-1.5 mt-1">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={d.annual}
                          onChange={(e) => setDraft(p.id, { annual: e.target.value })}
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          title="Set annual = 12 × monthly"
                          onClick={() => autoAnnual(p)}
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 lg:w-64 shrink-0 lg:justify-end">
                    <div className="text-xs text-graphite-500">
                      <div>
                        Now: <span className="font-bold text-midnight dark:text-white">{formatKwacha(p.price_monthly)}/mo</span>
                      </div>
                      <div>
                        <span className="font-bold text-midnight dark:text-white">{formatKwacha(p.price_annual)}/yr</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-graphite-600 cursor-pointer">
                      <Switch
                        checked={d.is_active}
                        onCheckedChange={(v) => setDraft(p.id, { is_active: v })}
                      />
                      Active
                    </label>
                    <Button
                      size="sm"
                      disabled={!dirty || savingId === p.id}
                      onClick={() => save(p)}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingId === p.id ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
