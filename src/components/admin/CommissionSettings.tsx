import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Save, RotateCcw } from "lucide-react";
import { useUserRoles } from "@/context/UserRolesContext";

interface CommissionSetting {
  id: string;
  entity_type: string;
  commission_percentage: number;
  is_active: boolean;
}

/** All entity types that participate in payment splits. Superadmin can change all of these. */
const PLATFORM_FEE_TYPES = ["app_owner", "health_personnel", "institution", "pharmacy"] as const;

const META: Record<string, { label: string; description: string; payee: string; def: number }> = {
  app_owner: {
    label: "Consultation platform fee",
    description:
      "Taken from each consultation / appointment payment. The rest is split between provider and institution.",
    payee: "Platform",
    def: 10,
  },
  health_personnel: {
    label: "Provider share",
    description:
      "Percentage of each consultation payment paid to the healthcare provider. For independent providers (no institution), they also receive the institution share.",
    payee: "Provider",
    def: 75,
  },
  institution: {
    label: "Institution share",
    description:
      "Percentage of each consultation payment paid to the institution/facility when the provider is affiliated. Inactive = provider receives this share.",
    payee: "Institution",
    def: 15,
  },
  pharmacy: {
    label: "Pharmacy sale platform fee",
    description: "Taken from each marketplace / pharmacy order. The rest is paid to the pharmacy.",
    payee: "Pharmacy",
    def: 2.5,
  },
};

export const CommissionSettings = () => {
  const { isSuperAdmin } = useUserRoles();
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

  const toggleActive = (id: string) => {
    setSettings((prev) =>
      prev.map((setting) => (setting.id === id ? { ...setting, is_active: !setting.is_active } : setting))
    );
  };

  const invalid = settings.some((s) => s.commission_percentage < 0 || s.commission_percentage > 100);
  const activeTotal = settings.filter((s) => s.is_active).reduce((sum, s) => sum + (s.commission_percentage || 0), 0);
  const totalExceeds = activeTotal > 100;

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from("commission_settings")
          .update({ 
            commission_percentage: setting.commission_percentage,
            is_active: setting.is_active 
          })
          .eq("id", setting.id);
        if (error) throw error;
      }
      toast.success("Payment splits updated successfully");
    } catch (error) {
      console.error("Error saving commission settings:", error);
      toast.error("Failed to save payment splits");
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
          <CardTitle>Payment Splits</CardTitle>
        </div>
        <CardDescription>
          Every patient payment is split according to these commission percentages.
          Only superadmins can change these. Inactive splits are treated as 0%.
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
                    <div className="flex items-center gap-2">
                      <Label className="font-medium">{meta?.label || setting.entity_type}</Label>
                      <Badge variant={setting.is_active ? "default" : "secondary"}>
                        {setting.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
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
                      disabled={!isSuperAdmin}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    {isSuperAdmin && (
                      <Button
                        variant={setting.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleActive(setting.id)}
                      >
                        {setting.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary">{meta?.payee || "Payee"}: {setting.commission_percentage.toFixed(2)}%</Badge>
                  {!setting.is_active && (
                    <span className="text-muted-foreground">(Inactive — treated as 0% in splits)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
          Changes take effect immediately for new payments. Existing payment splits are not retroactively modified.
        </div>

        {invalid && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Each payment split must be between 0% and 100%.</p>
          </div>
        )}

        {totalExceeds && !invalid && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Warning: Active splits total {activeTotal.toFixed(2)}%, which exceeds 100%. 
              This will over-allocate payments. Adjust the percentages so active splits total 100% or less.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {isSuperAdmin ? (
            <>
              <Button onClick={saveSettings} disabled={saving || invalid} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              <Button variant="outline" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Platform fees affect company revenue — only super admins can change them. Contact a super admin if an adjustment is needed.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
