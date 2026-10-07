import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface ProcedurePrice {
  procedure_id: string;
  procedure_name: string;
  default_price: number;
  custom_price: number | null;
  is_active: boolean;
  is_custom?: boolean;
}

/**
 * Lets an institution set its own prices for the clinical procedure catalog.
 * Falls back to each procedure's default_price when no override exists.
 * Only institution admins/staff should see this (enforced by RLS + routing).
 */
export function ClinicalProcedurePricing({ institutionId }: { institutionId: string }) {
  const [procedures, setProcedures] = useState<ProcedurePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: catalog, error: catErr }, { data: pricing, error: priceErr }] = await Promise.all([
          supabase.from("clinical_procedures").select("id, procedure_name, default_price, institution_id").order("procedure_name"),
          supabase.from("institution_procedure_pricing").select("procedure_id, price, is_active").eq("institution_id", institutionId),
        ]);
        if (catErr) throw catErr;
        if (priceErr) throw priceErr;
        const priceMap = new Map((pricing || []).map((p: any) => [p.procedure_id, p]));
        setProcedures(
          ((catalog || []) as any[]).map((c) => ({
            procedure_id: c.id,
            procedure_name: c.procedure_name,
            default_price: Number(c.default_price) || 0,
            custom_price: priceMap.has(c.id) ? Number((priceMap.get(c.id) as any).price) : null,
            is_active: priceMap.has(c.id) ? (priceMap.get(c.id) as any).is_active !== false : true,
            is_custom: !!c.institution_id,
          }))
        );
      } catch (e) {
        console.error("Failed to load procedure pricing:", e);
        toast.error("Failed to load procedure prices");
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  const addCustomProcedure = async () => {
    const name = newName.trim();
    const price = Math.max(0, Number(newPrice) || 0);
    if (!name) {
      toast.error("Enter a procedure name");
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("clinical_procedures")
        .insert({
          procedure_name: name,
          default_price: price,
          institution_id: institutionId,
        } as any)
        .select("id, procedure_name, default_price")
        .single();
      if (error) throw error;
      setProcedures((prev) =>
        [
          ...prev,
          {
            procedure_id: (data as any).id,
            procedure_name: (data as any).procedure_name,
            default_price: Number((data as any).default_price) || 0,
            custom_price: null,
            is_active: true,
            is_custom: true,
          },
        ].sort((a, b) => a.procedure_name.localeCompare(b.procedure_name))
      );
      setNewName("");
      setNewPrice("");
      setShowAdd(false);
      toast.success(`"${name}" added at K${price.toLocaleString()}`);
    } catch (e: any) {
      console.error("Failed to add procedure:", e);
      toast.error(`Failed to add procedure: ${e?.message || "unknown error"}`);
    } finally {
      setAdding(false);
    }
  };

  const savePrice = async (proc: ProcedurePrice, newPrice: number | null) => {
    setSaving(proc.procedure_id);
    try {
      if (newPrice == null) {
        // Revert to default: delete the override
        const { error } = await supabase
          .from("institution_procedure_pricing")
          .delete()
          .eq("institution_id", institutionId)
          .eq("procedure_id", proc.procedure_id);
      if (error) {
        console.error("Price save failed:", error);
        throw error;
      }
      } else {
        // Explicit insert-or-update: PostgREST onConflict is unreliable here
        // ("no unique constraint matching the ON CONFLICT specification").
        const { data: existing } = await supabase
          .from("institution_procedure_pricing")
          .select("id")
          .eq("institution_id", institutionId)
          .eq("procedure_id", proc.procedure_id)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("institution_procedure_pricing")
            .update({
              price: newPrice,
              currency: "ZMW",
              is_active: true,
              effective_from: new Date().toISOString().split("T")[0],
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", (existing as any).id);
          if (error) {
            console.error("Price update failed:", error);
            throw error;
          }
        } else {
          const { error } = await supabase.from("institution_procedure_pricing").insert({
            institution_id: institutionId,
            procedure_id: proc.procedure_id,
            price: newPrice,
            currency: "ZMW",
            is_active: true,
            effective_from: new Date().toISOString().split("T")[0],
          } as any);
          if (error) {
            console.error("Price insert failed:", error);
            throw error;
          }
        }
      }
      setProcedures((prev) =>
        prev.map((p) => (p.procedure_id === proc.procedure_id ? { ...p, custom_price: newPrice } : p))
      );
      toast.success(
        newPrice == null
          ? `${proc.procedure_name} reverted to default price`
          : `${proc.procedure_name} price set to K${newPrice.toLocaleString()}`
      );
    } catch (e: any) {
      console.error("Failed to save price:", e);
      toast.error(`Failed to save price: ${e?.message || e?.details || "unknown error"}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading procedure prices...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">
          Set your institution's prices for each clinical procedure. Leave blank to use the system default.
          These prices appear on patient bills.
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600"
        >
          {showAdd ? "Cancel" : "+ Add Custom Procedure"}
        </button>
      </div>
      {showAdd && (
        <div className="p-3 rounded-xl border border-primary-500/20 bg-primary-50 dark:bg-primary-950/20 flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-500">Procedure name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Wound Dressing"
              className="w-full mt-1 px-2 py-1.5 rounded-md border text-sm"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="text-xs font-bold text-slate-500">Price (K)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 px-2 py-1.5 rounded-md border text-sm text-right font-bold"
            />
          </div>
          <button
            onClick={addCustomProcedure}
            disabled={adding || !newName.trim()}
            className="px-4 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      )}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="py-2 px-3 font-bold">Procedure</th>
              <th className="py-2 px-3 font-bold text-right">Default</th>
              <th className="py-2 px-3 font-bold text-right">Your Price (K)</th>
              <th className="py-2 px-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {procedures.map((p) => {
              const effective = p.custom_price ?? p.default_price;
              return (
                <tr key={p.procedure_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2 px-3 font-medium">
                    {p.procedure_name}
                    {p.is_custom && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-100 text-primary-600 dark:bg-primary-900">
                        CUSTOM
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500">K{p.default_price.toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={p.custom_price ?? ""}
                      placeholder={String(p.default_price)}
                      id={`price-${p.procedure_id}`}
                      className="w-full px-2 py-1 rounded-md border text-right font-bold"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        disabled={saving === p.procedure_id}
                        onClick={() => {
                          const el = document.getElementById(`price-${p.procedure_id}`) as HTMLInputElement;
                          const val = el?.value?.trim();
                          savePrice(p, val === "" ? null : Math.max(0, Number(val) || 0));
                        }}
                        className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                        title={p.custom_price == null ? "Set custom price" : "Update price"}
                      >
                        {saving === p.procedure_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {p.custom_price != null && (
                        <button
                          disabled={saving === p.procedure_id}
                          onClick={() => {
                            const el = document.getElementById(`price-${p.procedure_id}`) as HTMLInputElement;
                            if (el) el.value = "";
                            savePrice(p, null);
                          }}
                          className="px-2 py-1 rounded-lg border text-xs font-bold text-slate-500 hover:bg-slate-100"
                          title="Revert to default price"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {p.custom_price != null && (
                      <p className="text-[10px] text-primary-500 font-bold text-right mt-0.5">
                        Effective: K{effective.toLocaleString()}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
