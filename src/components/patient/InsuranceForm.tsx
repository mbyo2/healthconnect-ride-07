import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { InsuranceProvider } from "@/types/healthcare";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          <Select
            value={formData.provider_name}
            onValueChange={(value) => setFormData({ ...formData, provider_name: value })}
          >
            <SelectTrigger id="provider_name" aria-label="Select insurance provider">
              <SelectValue placeholder="Select Insurance Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" disabled>Select Insurance Provider</SelectItem>
              
              {/* Zambian Insurance Providers Group */}
              <div className="px-2 py-1.5 text-sm font-semibold">Zambian Providers</div>
              <SelectItem value={InsuranceProvider.HOLLARD_HEALTH}>{InsuranceProvider.HOLLARD_HEALTH}</SelectItem>
              <SelectItem value={InsuranceProvider.SANLAM}>{InsuranceProvider.SANLAM}</SelectItem>
              <SelectItem value={InsuranceProvider.MADISON}>{InsuranceProvider.MADISON}</SelectItem>
              <SelectItem value={InsuranceProvider.PROFESSIONAL_INSURANCE}>{InsuranceProvider.PROFESSIONAL_INSURANCE}</SelectItem>
              <SelectItem value={InsuranceProvider.UNITURTLE}>{InsuranceProvider.UNITURTLE}</SelectItem>
              <SelectItem value={InsuranceProvider.SES_INTERNATIONAL}>{InsuranceProvider.SES_INTERNATIONAL}</SelectItem>
              <SelectItem value={InsuranceProvider.NHIMA}>{InsuranceProvider.NHIMA}</SelectItem>
              <SelectItem value={InsuranceProvider.PRUDENTIAL}>{InsuranceProvider.PRUDENTIAL}</SelectItem>
              
              {/* International Insurance Providers Group */}
              <div className="px-2 py-1.5 text-sm font-semibold">International Providers</div>
              <SelectItem value={InsuranceProvider.MEDICARE}>{InsuranceProvider.MEDICARE}</SelectItem>
              <SelectItem value={InsuranceProvider.MEDICAID}>{InsuranceProvider.MEDICAID}</SelectItem>
              <SelectItem value={InsuranceProvider.BLUE_CROSS}>{InsuranceProvider.BLUE_CROSS}</SelectItem>
              <SelectItem value={InsuranceProvider.CIGNA}>{InsuranceProvider.CIGNA}</SelectItem>
              <SelectItem value={InsuranceProvider.UNITED_HEALTHCARE}>{InsuranceProvider.UNITED_HEALTHCARE}</SelectItem>
              <SelectItem value={InsuranceProvider.AETNA}>{InsuranceProvider.AETNA}</SelectItem>
              <SelectItem value={InsuranceProvider.HUMANA}>{InsuranceProvider.HUMANA}</SelectItem>
              <SelectItem value={InsuranceProvider.KAISER_PERMANENTE}>{InsuranceProvider.KAISER_PERMANENTE}</SelectItem>
              <SelectItem value={InsuranceProvider.TRICARE}>{InsuranceProvider.TRICARE}</SelectItem>
              
              {/* Other options */}
              <div className="px-2 py-1.5 text-sm font-semibold">Other</div>
              <SelectItem value={InsuranceProvider.OTHER}>{InsuranceProvider.OTHER}</SelectItem>
              <SelectItem value={InsuranceProvider.NONE}>{InsuranceProvider.NONE}</SelectItem>
            </SelectContent>
          </Select>
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
