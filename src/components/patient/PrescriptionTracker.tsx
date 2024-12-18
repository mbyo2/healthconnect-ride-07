import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "lucide-react";
import { toast } from "sonner";

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescribed_by: string;
  prescribed_date: string;
  end_date?: string;
  notes?: string;
}

export const PrescriptionTracker = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    prescribed_by: "",
    prescribed_date: "",
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('prescriptions')
        .insert({
          ...formData,
          patient_id: user.id,
        });

      if (error) throw error;

      toast.success("Prescription added successfully!");
      setFormData({
        medication_name: "",
        dosage: "",
        frequency: "",
        prescribed_by: "",
        prescribed_date: "",
        end_date: "",
        notes: "",
      });
      fetchPrescriptions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Pill className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Prescription Tracker</h2>
      </div>

      <div className="space-y-4">
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="border p-4 rounded-lg">
            <h3 className="font-semibold">{prescription.medication_name}</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <p><strong>Dosage:</strong> {prescription.dosage}</p>
              <p><strong>Frequency:</strong> {prescription.frequency}</p>
              <p><strong>Prescribed By:</strong> {prescription.prescribed_by}</p>
              <p><strong>Prescribed Date:</strong> {prescription.prescribed_date}</p>
              {prescription.end_date && (
                <p><strong>End Date:</strong> {prescription.end_date}</p>
              )}
            </div>
            {prescription.notes && (
              <p className="mt-2 text-sm text-gray-600">
                <strong>Notes:</strong> {prescription.notes}
              </p>
            )}
          </div>
        ))}

        <form onSubmit={handleSubmit} className="border-t pt-4 mt-4 space-y-4">
          <div>
            <Label htmlFor="medication_name">Medication Name</Label>
            <Input
              id="medication_name"
              value={formData.medication_name}
              onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="dosage">Dosage</Label>
            <Input
              id="dosage"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Input
              id="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="prescribed_by">Prescribed By</Label>
            <Input
              id="prescribed_by"
              value={formData.prescribed_by}
              onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="prescribed_date">Prescribed Date</Label>
            <Input
              id="prescribed_date"
              type="date"
              value={formData.prescribed_date}
              onChange={(e) => setFormData({ ...formData, prescribed_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date (Optional)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Prescription"}
          </Button>
        </form>
      </div>
    </div>
  );
};