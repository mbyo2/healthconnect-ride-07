import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const InsuranceForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    provider_name: "",
    policy_number: "",
    group_number: "",
    coverage_start_date: "",
    coverage_end_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('insurance_information')
        .insert({
          ...formData,
          patient_id: user.id,
        });

      if (error) throw error;

      toast.success("Insurance information saved successfully!");
      setFormData({
        provider_name: "",
        policy_number: "",
        group_number: "",
        coverage_start_date: "",
        coverage_end_date: "",
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Insurance Information</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="provider_name">Provider Name</Label>
          <Input
            id="provider_name"
            value={formData.provider_name}
            onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="policy_number">Policy Number</Label>
          <Input
            id="policy_number"
            value={formData.policy_number}
            onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="group_number">Group Number</Label>
          <Input
            id="group_number"
            value={formData.group_number}
            onChange={(e) => setFormData({ ...formData, group_number: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="coverage_start_date">Coverage Start Date</Label>
          <Input
            id="coverage_start_date"
            type="date"
            value={formData.coverage_start_date}
            onChange={(e) => setFormData({ ...formData, coverage_start_date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="coverage_end_date">Coverage End Date</Label>
          <Input
            id="coverage_end_date"
            type="date"
            value={formData.coverage_end_date}
            onChange={(e) => setFormData({ ...formData, coverage_end_date: e.target.value })}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Insurance Information"}
        </Button>
      </form>
    </div>
  );
};