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

export const PrescriptionWriter = () => {
  const [prescription, setPrescription] = useState({
    patient_id: "",
    medication_name: "",
    dosage: "",
    frequency: "",
    duration: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('prescriptions')
        .insert({
          ...prescription,
          prescribed_by: user.id,
          prescribed_date: new Date().toISOString(),
        });

      if (error) throw error;
      
      toast.success("Prescription created successfully");
      setPrescription({
        patient_id: "",
        medication_name: "",
        dosage: "",
        frequency: "",
        duration: "",
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
            onValueChange={(value) => setPrescription({...prescription, patient_id: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">John Doe</SelectItem>
              <SelectItem value="2">Jane Smith</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Medication Name</Label>
          <Input
            value={prescription.medication_name}
            onChange={(e) => setPrescription({...prescription, medication_name: e.target.value})}
            placeholder="Enter medication name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Dosage</Label>
            <Input
              value={prescription.dosage}
              onChange={(e) => setPrescription({...prescription, dosage: e.target.value})}
              placeholder="e.g., 500mg"
            />
          </div>
          <div>
            <Label>Frequency</Label>
            <Input
              value={prescription.frequency}
              onChange={(e) => setPrescription({...prescription, frequency: e.target.value})}
              placeholder="e.g., Twice daily"
            />
          </div>
        </div>

        <div>
          <Label>Duration</Label>
          <Input
            value={prescription.duration}
            onChange={(e) => setPrescription({...prescription, duration: e.target.value})}
            placeholder="e.g., 7 days"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={prescription.notes}
            onChange={(e) => setPrescription({...prescription, notes: e.target.value})}
            placeholder="Additional instructions or notes"
          />
        </div>

        <Button type="submit" className="w-full">
          Create Prescription
        </Button>
      </form>
    </Card>
  );
};