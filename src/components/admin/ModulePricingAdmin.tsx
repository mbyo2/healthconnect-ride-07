import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Puzzle, Save, Loader2 } from "lucide-react";
import {
  getAllModulePrices,
  setModulePrice,
  type ModulePrice,
} from "@/services/institutionModules";

type Draft = { price: string; is_billable: boolean };

/**
 * Module Add-on Pricing — SUPERADMIN ONLY price list.
 * Every HMS module can be sold as a paid add-on. The superadmin sets the
 * monthly price here (K/month); NULL price or billable=off means the module
 * is not sold. Institutions see priced modules on their Modules & Add-ons
 * card; platform admins see the price when granting a module.
 */
export function ModulePricingAdmin() {
  const [rows, setRows] = useState<ModulePrice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const prices = await getAllModulePrices(supabase as any);
      setRows(prices);
      const next: Record<string, Draft> = {};
      prices.forEach((p) => {
        next[p.module_key] = {
          price: p.price_monthly == null ? "" : String(p.price_monthly),
          is_billable: p.is_billable,
        };
      });
      setDrafts(next);
    } catch {
      toast.error("Failed to load module pricing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (row: ModulePrice) => {
    const draft = drafts[row.module_key];
    if (!draft) return;
    const trimmed = draft.price.trim();
    const price = trimmed === "" ? null : Number(trimmed);
    if (price !== null && (!isFinite(price) || price < 0)) {
      toast.error("Enter a valid non-negative price (or leave blank for unset)");
      return;
    }
    setSavingKey(row.module_key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await setModulePrice(
        supabase as any,
        row.module_key,
        row.module_name,
        price,
        draft.is_billable,
        user?.id || ""
      );
      toast.success(`Price saved for “${row.module_name}”`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save price");
    } finally {
      setSavingKey(null);
    }
  };

  const pricedCount = rows.filter((r) => r.is_billable && r.price_monthly != null).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="font-extrabold text-sm flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-primary-500" /> Module Add-on Pricing
        </h2>
        <Badge variant="secondary" className="text-[10px] font-extrabold">
          {pricedCount} of {rows.length} priced
        </Badge>
      </div>
      <p className="text-xs text-graphite-500 mb-4">
        Superadmin price list for paid module add-ons. Set a monthly price (ZMW) per module —
        institutions see it on their Modules &amp; Add-ons card. Blank price or “Not billable”
        means the module isn't sold as an add-on.
      </p>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-graphite-500 py-4">
          No module price rows yet — run the <code className="text-xs">20260925_institution_module_pricing</code> migration.
        </p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {rows.map((row) => {
            const draft = drafts[row.module_key] || { price: "", is_billable: true };
            const dirty =
              (draft.price.trim() === "" ? null : Number(draft.price.trim())) !== row.price_monthly ||
              draft.is_billable !== row.is_billable;
            return (
              <div
                key={row.module_key}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-canvas-silk bg-canvas-mist/30"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-xs font-extrabold truncate" title={row.module_name}>{row.module_name}</p>
                  <p className="text-[10px] text-graphite-400 font-mono">{row.module_key}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-graphite-500">K</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unset"
                    value={draft.price}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [row.module_key]: { ...draft, price: e.target.value } }))
                    }
                    className="w-28 h-9 text-sm"
                  />
                  <span className="text-[10px] text-graphite-400 font-bold">/mo</span>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-graphite-500 cursor-pointer">
                  <Switch
                    checked={draft.is_billable}
                    onCheckedChange={(v) =>
                      setDrafts((d) => ({ ...d, [row.module_key]: { ...draft, is_billable: v } }))
                    }
                  />
                  Billable
                </label>
                <Button
                  size="sm"
                  onClick={() => save(row)}
                  disabled={!dirty || savingKey === row.module_key}
                  className="vf-btn-primary text-xs h-9"
                >
                  {savingKey === row.module_key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-1" /> Save</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
