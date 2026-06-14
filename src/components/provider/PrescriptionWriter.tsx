import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkInteractions, getPatientActiveMedications, isBlocking, summarize } from "@/utils/drug-interactions";
import { AlertTriangle } from "lucide-react";

export const PrescriptionWriter = () => {
  const [interactionWarning, setInteractionWarning] = useState<string>("");
  const [overrideAck, setOverrideAck] = useState(false);
  const [prescription, setPrescription] = useState({
    patient_id: "",
    medication_name: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: "1",
    notes: "",
  });

  const runInteractionCheck = async (): Promise<{ blocking: boolean; message: string }> => {
    if (!prescription.patient_id || !prescription.medication_name) return { blocking: false, message: "" };
    const existing = await getPatientActiveMedications(prescription.patient_id);
    const interactions = await checkInteractions(prescription.medication_name, existing);
    if (!interactions.length) return { blocking: false, message: "" };
    const blocking = interactions.some(i => isBlocking(i.severity));
    return { blocking, message: summarize(interactions) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Drug-interaction safety gate
      const check = await runInteractionCheck();
      if (check.message) {
        setInteractionWarning(check.message);
        if (check.blocking && !overrideAck) {
          toast.error("Major drug interaction detected — review and confirm to override.");
          return;
        }
      }

      const durationDays = parseInt(prescription.duration) || 7;

      const { error } = await supabase
        .from('comprehensive_prescriptions')
        .insert({
          patient_id: prescription.patient_id,
          medication_name: prescription.medication_name,
          dosage: `${prescription.dosage} - ${prescription.frequency}`,
          instructions: `${prescription.frequency}. ${prescription.notes}`,
          duration_days: durationDays,
          quantity: parseInt(prescription.quantity) || 1,
          provider_id: user.id,
          prescribed_date: new Date().toISOString(),
          status: 'active',
          notes: check.message
            ? `${prescription.notes}\n[Interaction noted & acknowledged]: ${check.message}`
            : prescription.notes
        });

      if (error) throw error;

      toast.success("Prescription created successfully");
      setInteractionWarning("");
      setOverrideAck(false);
      setPrescription({
        patient_id: "",
        medication_name: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "1",
        notes: "",
      });
    } catch (error) {
      console.error("Error creating prescription:", error);
      toast.error("Failed to create prescription");
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Write Prescription</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Patient</Label>
          <Select
            value={prescription.patient_id}
            onValueChange={(value) => setPrescription({ ...prescription, patient_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">John Doe</SelectItem>
              <SelectItem value="2">Jane Smith</SelectItem>
              {/* In a real app, fetch patients from DB */}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Medication Name</Label>
          <Input
            value={prescription.medication_name}
            onChange={(e) => setPrescription({ ...prescription, medication_name: e.target.value })}
            placeholder="Enter medication name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Dosage</Label>
            <Input
              value={prescription.dosage}
              onChange={(e) => setPrescription({ ...prescription, dosage: e.target.value })}
              placeholder="e.g., 500mg"
            />
          </div>
          <div>
            <Label>Frequency</Label>
            <Input
              value={prescription.frequency}
              onChange={(e) => setPrescription({ ...prescription, frequency: e.target.value })}
              placeholder="e.g., Twice daily"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Duration (Days)</Label>
            <Input
              value={prescription.duration}
              onChange={(e) => setPrescription({ ...prescription, duration: e.target.value })}
              placeholder="e.g., 7"
              type="number"
            />
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              value={prescription.quantity}
              onChange={(e) => setPrescription({ ...prescription, quantity: e.target.value })}
              placeholder="e.g., 30"
              type="number"
            />
          </div>
        </div>

        <div>
          <Label>Notes / Instructions</Label>
          <Textarea
            value={prescription.notes}
            onChange={(e) => setPrescription({ ...prescription, notes: e.target.value })}
            placeholder="Additional instructions or notes"
          />
        </div>

        {interactionWarning && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="whitespace-pre-line">{interactionWarning}</div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={overrideAck} onChange={(e) => setOverrideAck(e.target.checked)} />
              I have reviewed and will proceed despite the interaction.
            </label>
          </div>
        )}

        <Button type="submit" className="w-full">
          Create Prescription
        </Button>
      </form>
    </Card>
  );
};