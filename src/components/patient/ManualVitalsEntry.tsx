import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HeartPulse, Plus } from "lucide-react";
import { toast } from "sonner";

/**
 * Patient self-reported vitals entry.
 * Writes to vital_signs with user_id = patient, flagged as self-reported in metadata.
 */
export const ManualVitalsEntry = ({ onSaved }: { onSaved?: () => void }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    heart_rate: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    temperature: "",
    weight: "",
    blood_sugar: "",
  });

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    try {
      // At least one vital required
      const hasAny = Object.values(form).some((v) => v.trim() !== "");
      if (!hasAny) {
        toast.error("Enter at least one vital sign");
        return;
      }

      setSaving(true);
      const payload: any = {
        user_id: user?.id,
        recorded_at: new Date().toISOString(),
        metadata: {
          recorded_by: user?.id,
          source: "patient_self_report",
          notes: "Self-reported by patient via app",
        },
      };

      if (form.heart_rate.trim()) payload.heart_rate = parseInt(form.heart_rate);
      if (form.blood_pressure_systolic.trim()) payload.blood_pressure_systolic = parseInt(form.blood_pressure_systolic);
      if (form.blood_pressure_diastolic.trim()) payload.blood_pressure_diastolic = parseInt(form.blood_pressure_diastolic);
      if (form.temperature.trim()) payload.temperature = parseFloat(form.temperature);
      if (form.weight.trim()) payload.weight = parseFloat(form.weight);
      if (form.blood_sugar.trim()) {
        payload.metadata.blood_sugar = parseFloat(form.blood_sugar);
      }

      const { error } = await supabase.from("vital_signs").insert(payload);
      if (error) throw error;

      window.dispatchEvent(new CustomEvent("app-feedback", {
        detail: { type: "success", title: "Vitals recorded", description: "Your health metrics have been updated." }
      }));
      const { celebrate } = await import("@/utils/celebration");
      celebrate({ intensity: "small" });

      setOpen(false);
      setForm({
        heart_rate: "",
        blood_pressure_systolic: "",
        blood_pressure_diastolic: "",
        temperature: "",
        weight: "",
        blood_sugar: "",
      });
      onSaved?.();
    } catch (error) {
      console.error("Error saving vitals:", error);
      toast.error("Failed to save vitals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" />
          Record Vitals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-red-500" />
            Record Your Vitals
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label>Heart rate (bpm)</Label>
            <Input
              type="number"
              value={form.heart_rate}
              onChange={(e) => set("heart_rate", e.target.value)}
              placeholder="72"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Temperature (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={(e) => set("temperature", e.target.value)}
              placeholder="36.5"
              className="mt-1"
            />
          </div>
          <div>
            <Label>BP Systolic</Label>
            <Input
              type="number"
              value={form.blood_pressure_systolic}
              onChange={(e) => set("blood_pressure_systolic", e.target.value)}
              placeholder="120"
              className="mt-1"
            />
          </div>
          <div>
            <Label>BP Diastolic</Label>
            <Input
              type="number"
              value={form.blood_pressure_diastolic}
              onChange={(e) => set("blood_pressure_diastolic", e.target.value)}
              placeholder="80"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              placeholder="70"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Blood sugar (mmol/L)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.blood_sugar}
              onChange={(e) => set("blood_sugar", e.target.value)}
              placeholder="5.5"
              className="mt-1"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Self-reported vitals are flagged as patient-entered for your provider to review.
        </p>
        <Button onClick={save} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
          {saving ? "Saving…" : "Save Vitals"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
