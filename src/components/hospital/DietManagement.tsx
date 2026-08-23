import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Utensils, AlertTriangle, CheckCircle2, Plus, Loader2, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DietManagement = ({ hospital }: { hospital: any }) => {
  const [showPrescribeDiet, setShowPrescribeDiet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    patient_name: "",
    diet_type: "Regular",
    restrictions: "",
    allergies: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
    calories_per_day: "",
    meals_per_day: "3",
  });

  const { data: plans, loading, error, refresh } = useHospitalModule<any>(
    "diet_plans", "hospital_id", hospital?.id, { orderBy: "start_date", ascending: false }
  );
  const { nameFor } = usePatientNames(plans.map((p) => p.patient_id));

  const today = new Date().toISOString().slice(0, 10);
  const activePlans = plans.filter((p) => !p.end_date || p.end_date >= today);
  const withAllergies = plans.filter((p) => p.allergies && String(p.allergies).trim().length > 0);

  const handlePrescribeDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.diet_type || !form.start_date) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("diet_plans" as any) as any).insert({
        hospital_id: hospital.id,
        diet_type: form.diet_type,
        restrictions: form.restrictions ? form.restrictions.split(",").map((s) => s.trim()) : [],
        allergies: form.allergies,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes,
        calories_per_day: form.calories_per_day ? Number(form.calories_per_day) : null,
        meals_per_day: Number(form.meals_per_day) || 3,
      });
      if (err) throw err;
      toast.success("Diet plan prescribed successfully");
      setShowPrescribeDiet(false);
      setForm({
        patient_name: "",
        diet_type: "Regular",
        restrictions: "",
        allergies: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        notes: "",
        calories_per_day: "",
        meals_per_day: "3",
      });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to prescribe diet plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-[#e6e9ef] pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Utensils className="h-5 w-5 text-[#0073ea]" />
            Inpatient Clinical Diet & Nutrition WorkOS
          </h3>
          <p className="text-xs text-[#676879] font-medium">
            Manage prescribed nutrition plans, food allergies, and dietary restrictions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-[#e5f0ff] font-bold text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowPrescribeDiet(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Prescribe Diet
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
          <Utensils className="h-5 w-5 mx-auto text-[#0073ea] mb-1" />
          <div className="text-2xl font-black font-mono text-[#0073ea]">{activePlans.length}</div>
          <div className="text-[10px] text-[#676879] font-bold uppercase">Active Meal Plans</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-[#e2445c] mb-1" />
          <div className="text-2xl font-black font-mono text-[#e2445c]">{withAllergies.length}</div>
          <div className="text-[10px] text-[#676879] font-bold uppercase">Known Allergies</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-[#00c875] mb-1" />
          <div className="text-2xl font-black font-mono text-[#00c875]">{plans.length}</div>
          <div className="text-[10px] text-[#676879] font-bold uppercase">Total Plans Issued</div>
        </div>
      </div>

      {/* Active Plans List */}
      <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
              <th className="py-2.5 px-4">Patient Name</th>
              <th className="py-2.5 px-3">Diet Category</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3">Caloric Target</th>
              <th className="py-2.5 px-3">Known Allergies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e9ef]">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-[#f0f2f7] transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900">{nameFor(p.patient_id) || "Inpatient Resident"}</td>
                <td className="py-3 px-3 font-semibold text-[#0073ea]">{p.diet_type || "Regular"}</td>
                <td className="py-3 px-3 text-center">
                  {!p.end_date || p.end_date >= today ? (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Active Plan</span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-slate-400">Completed</span>
                  )}
                </td>
                <td className="py-3 px-3 font-mono">
                  {p.calories_per_day ? `${p.calories_per_day} kcal/day` : "Standard Meal"}
                </td>
                <td className="py-3 px-3 font-bold text-[#e2445c]">
                  {p.allergies || "None Reported"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Prescribe Diet Modal */}
      <Dialog open={showPrescribeDiet} onOpenChange={setShowPrescribeDiet}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900 border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Prescribe Inpatient Diet Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePrescribeDiet} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Diet Type *</label>
              <select
                className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                value={form.diet_type}
                onChange={(e) => setForm({ ...form, diet_type: e.target.value })}
              >
                {["Regular", "Low Sodium", "Diabetic / Low Sugar", "High Protein", "Liquid Diet", "Nil By Mouth (NBM)"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Start Date *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                  required
                />
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Calories / Day</label>
                <input
                  type="number"
                  value={form.calories_per_day}
                  onChange={(e) => setForm({ ...form, calories_per_day: e.target.value })}
                  placeholder="1800"
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowPrescribeDiet(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold shadow-xs">
                {isSubmitting ? "Saving..." : "Prescribe Diet Plan"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DietManagement;
