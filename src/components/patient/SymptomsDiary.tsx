import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const SymptomsDiary = () => {
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("symptoms_diary" as any).insert({
        patient_id: user.id,
        symptoms,
        severity,
        notes,
      });

      if (error) throw error;

      toast.success("Symptoms recorded successfully");
      setSymptoms("");
      setSeverity("");
      setNotes("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Symptom Diary</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Symptoms</label>
            <Textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe your symptoms..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Severity</label>
            <Select value={severity} onValueChange={setSeverity} required>
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Recording..." : "Record Symptoms"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};