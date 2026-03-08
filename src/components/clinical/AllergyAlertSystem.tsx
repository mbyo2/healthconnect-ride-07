import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Shield, ShieldAlert, ShieldX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Allergy {
  id: string;
  allergen_name: string;
  allergen_type: string;
  severity: string;
  reaction: string;
  is_active: boolean;
}

interface Props {
  patientId: string;
  onAllergyCheck?: (allergies: Allergy[]) => void;
  compact?: boolean;
}

const severityConfig: Record<string, { color: string; icon: any; label: string }> = {
  mild: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Shield, label: 'Mild' },
  moderate: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: ShieldAlert, label: 'Moderate' },
  severe: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: ShieldX, label: 'Severe' },
  life_threatening: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: AlertTriangle, label: 'Life-Threatening' },
};

export const AllergyAlertSystem = ({ patientId, onAllergyCheck, compact }: Props) => {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ allergen_name: '', allergen_type: 'drug', severity: 'moderate', reaction: '' });

  const fetchAllergies = useCallback(async () => {
    const { data } = await supabase
      .from('patient_allergies' as any)
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('severity');
    
    const result = (data as any[] || []) as Allergy[];
    setAllergies(result);
    onAllergyCheck?.(result);
  }, [patientId, onAllergyCheck]);

  useEffect(() => { fetchAllergies(); }, [fetchAllergies]);

  const addAllergy = async () => {
    if (!form.allergen_name) { toast.error('Allergen name required'); return; }
    const { error } = await supabase.from('patient_allergies' as any).insert({
      patient_id: patientId,
      allergen_name: form.allergen_name,
      allergen_type: form.allergen_type,
      severity: form.severity,
      reaction: form.reaction,
    });
    if (error) { toast.error('Failed to add allergy'); return; }
    toast.success('Allergy recorded');
    setForm({ allergen_name: '', allergen_type: 'drug', severity: 'moderate', reaction: '' });
    setShowAdd(false);
    fetchAllergies();
  };

  const removeAllergy = async (id: string) => {
    await supabase.from('patient_allergies' as any).update({ is_active: false }).eq('id', id);
    toast.success('Allergy removed');
    fetchAllergies();
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {allergies.length === 0 ? (
          <Badge variant="outline" className="text-[10px]">No Known Allergies</Badge>
        ) : (
          allergies.map(a => {
            const config = severityConfig[a.severity] || severityConfig.moderate;
            return (
              <Badge key={a.id} className={`text-[10px] ${config.color}`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {a.allergen_name} ({config.label})
              </Badge>
            );
          })
        )}
      </div>
    );
  }

  return (
    <Card className={allergies.some(a => a.severity === 'life_threatening') ? 'border-destructive' : allergies.length > 0 ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${allergies.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            Allergies ({allergies.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {allergies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No known allergies (NKA)</p>
        ) : (
          allergies.map(a => {
            const config = severityConfig[a.severity] || severityConfig.moderate;
            const Icon = config.icon;
            return (
              <div key={a.id} className={`flex items-center justify-between p-2 rounded-md ${config.color}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <div>
                    <span className="text-xs font-semibold">{a.allergen_name}</span>
                    <span className="text-[10px] ml-2 opacity-75">({a.allergen_type})</span>
                    {a.reaction && <p className="text-[10px] opacity-75">Reaction: {a.reaction}</p>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeAllergy(a.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Allergy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Allergen (e.g., Penicillin)" value={form.allergen_name}
              onChange={e => setForm(p => ({ ...p, allergen_name: e.target.value }))} />
            <Select value={form.allergen_type} onValueChange={v => setForm(p => ({ ...p, allergen_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drug">Drug</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="latex">Latex</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
                <SelectItem value="life_threatening">Life-Threatening</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Reaction (e.g., Rash, Anaphylaxis)" value={form.reaction}
              onChange={e => setForm(p => ({ ...p, reaction: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addAllergy}>Save Allergy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Utility: Check prescribed drug against patient allergies
export const checkDrugAllergy = (drugName: string, allergies: Allergy[]): { blocked: boolean; warning: string | null } => {
  const drugLower = drugName.toLowerCase();
  for (const allergy of allergies) {
    if (allergy.allergen_type !== 'drug') continue;
    const allergenLower = allergy.allergen_name.toLowerCase();
    if (drugLower.includes(allergenLower) || allergenLower.includes(drugLower)) {
      if (allergy.severity === 'severe' || allergy.severity === 'life_threatening') {
        return { blocked: true, warning: `⛔ BLOCKED: ${drugName} matches known allergy "${allergy.allergen_name}" (${allergy.severity}). Choose an alternative.` };
      }
      return { blocked: false, warning: `⚠️ WARNING: ${drugName} may cause reaction. Patient allergic to "${allergy.allergen_name}" (${allergy.severity}).` };
    }
  }
  return { blocked: false, warning: null };
};

// Utility: Check drug interactions
export const checkDrugInteractions = async (drugs: string[]): Promise<Array<{ drug_a: string; drug_b: string; severity: string; description: string; management: string }>> => {
  if (drugs.length < 2) return [];
  const { data } = await supabase.from('drug_interactions' as any).select('*');
  if (!data) return [];

  const interactions: any[] = [];
  const drugsLower = drugs.map(d => d.toLowerCase());

  for (const interaction of data as any[]) {
    const a = interaction.drug_a.toLowerCase();
    const b = interaction.drug_b.toLowerCase();
    const matchA = drugsLower.some(d => d.includes(a) || a.includes(d));
    const matchB = drugsLower.some(d => d.includes(b) || b.includes(d));
    if (matchA && matchB) {
      interactions.push(interaction);
    }
  }
  return interactions;
};

// Utility: Check drug risk level
export const checkDrugRiskLevel = async (drugName: string): Promise<{ risk_level: string; risk_category: string; special_instructions: string } | null> => {
  const { data } = await supabase
    .from('drug_risk_levels' as any)
    .select('*')
    .or(`drug_name.ilike.%${drugName}%,generic_name.ilike.%${drugName}%`)
    .limit(1)
    .maybeSingle();
  return data as any;
};
