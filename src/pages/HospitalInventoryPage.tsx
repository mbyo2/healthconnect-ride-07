import { useState } from "react";
import { Package, Shield, Loader2 } from "lucide-react";
import { InventoryManagerWorkflow } from "@/components/workflows/InventoryManagerWorkflow";
import { CSSDManagement } from "@/components/hospital/CSSDManagement";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

/**
 * Standalone Hospital Inventory page: general (non-medication) stock for
 * the user's institution — receive / issue / transfer / adjust / write-off
 * through the movement ledger — plus the CSSD sterilisation tab.
 * Route-gated in App.tsx consistently with DrugStockPage (pharmacist,
 * doctor, specialist, clinical_officer, institution_admin,
 * inventory_manager).
 */
export default function HospitalInventoryPage() {
  const { institution: hospital, loading } = useInstitutionContext();
  const [tab, setTab] = useState<"stock" | "cssd">("stock");

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-[#003087] text-white rounded-xl flex items-center justify-center shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Hospital inventory</h1>
          <p className="text-muted-foreground text-sm">
            General stock for {hospital?.name || "your facility"} — consumables, surgical supplies, PPE, linen and equipment, tracked by department.
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-6" role="tablist" aria-label="Hospital inventory sections">
        <button
          role="tab"
          aria-selected={tab === "stock"}
          onClick={() => setTab("stock")}
          className={`px-4 py-2 rounded-full text-xs font-bold min-h-[40px] flex items-center gap-1.5 ${tab === "stock" ? "bg-[#003087] text-white" : "bg-muted text-foreground"}`}
        >
          <Package className="h-4 w-4" /> Stock & Movements
        </button>
        <button
          role="tab"
          aria-selected={tab === "cssd"}
          onClick={() => setTab("cssd")}
          className={`px-4 py-2 rounded-full text-xs font-bold min-h-[40px] flex items-center gap-1.5 ${tab === "cssd" ? "bg-[#003087] text-white" : "bg-muted text-foreground"}`}
        >
          <Shield className="h-4 w-4" /> CSSD
        </button>
      </div>

      {tab === "stock" ? (
        <InventoryManagerWorkflow />
      ) : hospital ? (
        <CSSDManagement hospital={hospital} />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">
          No facility is linked to this account yet, so CSSD items can't be shown. Ask your institution administrator to link your account.
        </p>
      )}
    </div>
  );
}
