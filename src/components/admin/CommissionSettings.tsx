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
        .from('commission_settings')
        .select('*')
        .order('entity_type');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching commission settings:', error);
      toast.error('Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (id: string, percentage: number) => {
    setSettings(prev => prev.map(setting => 
      setting.id === id 
        ? { ...setting, commission_percentage: percentage }
        : setting
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = settings.map(setting => ({
        id: setting.id,
        commission_percentage: setting.commission_percentage
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('commission_settings')
          .update({ commission_percentage: update.commission_percentage })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Commission settings updated successfully');
    } catch (error) {
      console.error('Error saving commission settings:', error);
      toast.error('Failed to save commission settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(prev => prev.map(setting => ({
      ...setting,
      commission_percentage: getDefaultPercentage(setting.entity_type)
    })));
  };

  const getDefaultPercentage = (entityType: string) => {
    switch (entityType) {
      case 'app_owner': return 10.00;
      case 'institution': return 15.00;
      case 'health_personnel': return 75.00;
      default: return 0.00;
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'app_owner': return 'Platform Fee';
      case 'institution': return 'Institution Commission';
      case 'health_personnel': return 'Provider Commission';
      default: return entityType;
    }
  };

  const totalPercentage = settings.reduce((sum, setting) => sum + setting.commission_percentage, 0);

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
          <CardTitle>Commission Settings</CardTitle>
        </div>
        <CardDescription>
          Configure how payments are split between platform, institutions, and providers
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {settings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="font-medium">
                  {getEntityLabel(setting.entity_type)}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Percentage of each payment allocated to {setting.entity_type.replace('_', ' ')}
                </p>
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
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="font-medium">Total Percentage:</span>
          <Badge variant={totalPercentage === 100 ? "default" : "destructive"}>
            {totalPercentage.toFixed(2)}%
          </Badge>
        </div>

        {totalPercentage !== 100 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              Warning: Total percentage should equal 100%. Current total is {totalPercentage.toFixed(2)}%
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={saveSettings} 
            disabled={saving || totalPercentage !== 100}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};