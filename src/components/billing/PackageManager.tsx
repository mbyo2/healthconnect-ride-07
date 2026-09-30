/**
 * Surgery & visit package manager — bundled procedures with margin tracking.
 * Insta HMS parity: surgery packages with margins, multi-visit packages.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionContext } from "@/contexts/InstitutionContext";
import { toast } from "sonner";

interface SurgeryPackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  components: Array<{ tariff_code: string; tariff_name: string; quantity: number; cost_price: number }>;
  total_cost: number;
  package_price: number;
  margin: number;
  margin_percent: number;
  is_available: boolean;
}

interface VisitPackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  service_type: string;
  total_visits: number;
  package_price: number;
  single_visit_price: number | null;
  validity_days: number | null;
  is_available: boolean;
}

async function listSurgeryPackages(institutionId: string): Promise<SurgeryPackage[]> {
  const { data, error } = await supabase
    .from("surgery_packages" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("name");
  if (error) throw error;
  return (data as any[]) || [];
}

async function listVisitPackages(institutionId: string): Promise<VisitPackage[]> {
  const { data, error } = await supabase
    .from("visit_packages" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("name");
  if (error) throw error;
  return (data as any[]) || [];
}

export function PackageManager() {
  const { institutionId } = useInstitutionContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"surgery" | "visits">("surgery");

  const surgeryQuery = useQuery({
    queryKey: ["surgery-packages", institutionId],
    queryFn: () => listSurgeryPackages(institutionId as string),
    enabled: !!institutionId,
  });

  const visitQuery = useQuery({
    queryKey: ["visit-packages", institutionId],
    queryFn: () => listVisitPackages(institutionId as string),
    enabled: !!institutionId,
  });

  const toggleSurgery = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from("surgery_packages" as any)
        .update({ is_available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surgery-packages", institutionId] });
      toast.success("Package updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const toggleVisit = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from("visit_packages" as any)
        .update({ is_available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit-packages", institutionId] });
      toast.success("Package updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const fmt = (n: number) => `K${Number(n || 0).toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("surgery")}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "surgery" ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Surgery Packages
        </button>
        <button
          onClick={() => setTab("visits")}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "visits" ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Multi-Visit Packages
        </button>
      </div>

      {tab === "surgery" && (
        <div className="space-y-3">
          {(surgeryQuery.data || []).map((p) => (
            <div key={p.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.code}{p.description ? ` — ${p.description}` : ""}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {p.components.length} components · Cost {fmt(p.total_cost)} · Price {fmt(p.package_price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${p.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Margin {fmt(p.margin)} ({Number(p.margin_percent).toFixed(1)}%)
                  </div>
                  <button
                    onClick={() => toggleSurgery.mutate({ id: p.id, is_available: !p.is_available })}
                    className="text-xs mt-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                  >
                    {p.is_available ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {surgeryQuery.data?.length === 0 && (
            <div className="text-sm text-slate-500 border rounded-xl p-6 text-center">
              No surgery packages yet. Create bundled procedure packages (e.g. "Caesarean Section Bundle") with component costs to track margins.
            </div>
          )}
        </div>
      )}

      {tab === "visits" && (
        <div className="space-y-3">
          {(visitQuery.data || []).map((p) => {
            const savings = p.single_visit_price
              ? p.single_visit_price * p.total_visits - p.package_price
              : 0;
            return (
              <div key={p.id} className="border rounded-xl p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.code} · {p.service_type}{p.description ? ` — ${p.description}` : ""}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {p.total_visits} visits · {fmt(p.package_price)}
                      {p.validity_days ? ` · valid ${p.validity_days} days` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    {savings > 0 && (
                      <div className="font-bold text-emerald-600">Saves {fmt(savings)}</div>
                    )}
                    <button
                      onClick={() => toggleVisit.mutate({ id: p.id, is_available: !p.is_available })}
                      className="text-xs mt-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                    >
                      {p.is_available ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {visitQuery.data?.length === 0 && (
            <div className="text-sm text-slate-500 border rounded-xl p-6 text-center">
              No visit packages yet. Create bundles like "Dialysis 12-Session Pack" or "Physio 10-Session Pack".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
