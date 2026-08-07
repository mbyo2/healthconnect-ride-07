import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Save, RotateCcw } from "lucide-react";

interface CommissionSetting {
  id: string;
  entity_type: string;
  commission_percentage: number;
  is_active: boolean;
}

/** Only these two entity types are part of the two-party split. */
const PLATFORM_FEE_TYPES = ["app_owner", "pharmacy"] as const;

const META: Record<string, { label: string; description: string; payee: string; def: number }> = {
  app_owner: {
    label: "Consultation platform fee",
    description:
      "Taken from each consultation / appointment payment. The rest is paid to the provider (or the facility that billed the visit).",
    payee: "Provider / facility",
    def: 0,
  },
  pharmacy: {
    label: "Pharmacy sale platform fee",
    description: "Taken from each marketplace / pharmacy order. The rest is paid to the pharmacy.",
    payee: "Pharmacy",
    def: 2.5,
  },
};

export const CommissionSettings = () => {
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("commission_settings")
        .select("*")
        .in("entity_type", PLATFORM_FEE_TYPES as unknown as string[])
        .order("entity_type");

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching commission settings:", error);
      toast.error("Failed to load commission settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (id: string, percentage: number) => {
    setSettings((prev) =>
      prev.map((setting) => (setting.id === id ? { ...setting, commission_percentage: percentage } : setting))
    );
  };

  const invalid = settings.some((s) => s.commission_percentage < 0 || s.commission_percentage > 100);

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from("commission_settings")
          .update({ commission_percentage: setting.commission_percentage })
          .eq("id", setting.id);
        if (error) throw error;
      }
      toast.success("Platform fees updated successfully");
    } catch (error) {
      console.error("Error saving commission settings:", error);
      toast.error("Failed to save platform fees");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings((prev) =>
      prev.map((setting) => ({
        ...setting,
        commission_percentage: META[setting.entity_type]?.def ?? 0,
      }))
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Platform Fees</CardTitle>
        </div>
        <CardDescription>
          Every patient payment is split between exactly two parties: the platform fee and the provider or pharmacy
          receiving the payment. Nobody else takes a cut.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          {settings.map((setting) => {
            const meta = META[setting.entity_type];
            const payeeShare = Math.max(0, 100 - (setting.commission_percentage || 0));
            return (
              <div key={setting.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="font-medium">{meta?.label || setting.entity_type}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{meta?.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={setting.commission_percentage}
                      onChange={(e) => updateSetting(setting.id, parseFloat(e.target.value) || 0)}
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary">Platform {setting.commission_percentage.toFixed(2)}%</Badge>
                  <Badge variant="outline">
                    {meta?.payee || "Payee"} {payeeShare.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
          Provider revenue on consultations comes from the per-new-patient booking fee (see the Pricing page), not from a
          revenue share — leave the consultation platform fee at 0% to keep that model.
        </div>

        {invalid && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Each platform fee must be between 0% and 100%.</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={saving || invalid} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
