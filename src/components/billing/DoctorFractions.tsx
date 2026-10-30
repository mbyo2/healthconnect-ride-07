import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Percent, Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Dr. Fraction Management System (Danphe-style)
 * Dynamic doctor revenue fraction rules: percentage splits per procedure/doctor.
 */

interface FractionRule {
  id: string;
  doctor_id: string;
  procedure_category: string | null;
  procedure_code: string | null;
  doctor_percentage: number;
  institution_percentage: number;
  is_active: boolean;
  doctor_name?: string;
}

interface FractionEarning {
  id: string;
  doctor_id: string;
  procedure_name: string;
  gross_amount: number;
  doctor_percentage: number;
  doctor_amount: number;
  institution_amount: number;
  status: string;
  created_at: string;
  doctor_name?: string;
}

const CATEGORIES = [
  'consultation',
  'surgery',
  'procedure',
  'lab',
  'imaging',
  'emergency',
  'icu',
];

export function DoctorFractionManager({ institutionId }: { institutionId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: "",
    procedure_category: "",
    doctor_percentage: "50",
  });

  // Get doctors in institution
  const { data: doctors } = useQuery({
    queryKey: ['institution-doctors', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_staff')
        .select('provider_id')
        .eq('institution_id', institutionId)
        .eq('is_active', true);
      if (error) throw error;
      
      const ids = (data || []).map((d: any) => d.provider_id);
      if (ids.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids);
      return profiles || [];
    },
    enabled: !!institutionId,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['fraction-rules', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_fraction_rules')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const rows = (data as FractionRule[]) || [];
      if (rows.length === 0) return [];
      
      // Fetch doctor profiles directly (avoids race with separate doctors query)
      const doctorIds = [...new Set(rows.map(r => r.doctor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', doctorIds);
      const doctorMap = Object.fromEntries((profiles || []).map((d: any) => [d.id, d]));
      
      return rows.map(r => ({
        ...r,
        doctor_name: doctorMap[r.doctor_id]
          ? `${doctorMap[r.doctor_id].first_name} ${doctorMap[r.doctor_id].last_name}`
          : 'Unknown',
      }));
    },
    enabled: !!institutionId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(formData.doctor_percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) throw new Error("Percentage must be 0-100");
      if (!formData.doctor_id) throw new Error("Select a doctor");
      
      const { error } = await supabase
        .from('doctor_fraction_rules')
        .insert({
          institution_id: institutionId,
          doctor_id: formData.doctor_id,
          procedure_category: formData.procedure_category || null,
          doctor_percentage: pct,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraction-rules', institutionId] });
      setShowAdd(false);
      setFormData({ doctor_id: "", procedure_category: "", doctor_percentage: "50" });
      toast.success("Fraction rule added");
    },
    onError: (e: any) => {
      toast.error(friendlyErrorMessage(e, "Failed to add rule. You may not have permission."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('doctor_fraction_rules')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraction-rules', institutionId] });
      toast.success("Rule deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate rule. You may not have permission.");
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading fraction rules...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4" />
            Doctor Fraction Rules
          </CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!rules || rules.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fraction rules configured. Add rules to define doctor revenue splits.
          </p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">{rule.doctor_name}</p>
                <p className="text-xs text-muted-foreground">
                  {rule.procedure_category || 'All procedures'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {rule.doctor_percentage}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Institution: {rule.institution_percentage}%
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(rule.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add fraction rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Doctor *</label>
              <Select
                value={formData.doctor_id}
                onValueChange={(v) => setFormData({ ...formData, doctor_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {(doctors || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Procedure category (optional)</label>
              <Select
                value={formData.procedure_category}
                onValueChange={(v) => setFormData({ ...formData, procedure_category: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All procedures" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to apply to all procedures
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Doctor percentage *</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.doctor_percentage}
                  onChange={(e) => setFormData({ ...formData, doctor_percentage: e.target.value })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <span className="text-xs text-muted-foreground ml-2">
                  Institution gets {(100 - parseFloat(formData.doctor_percentage || "0")).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!formData.doctor_id || addMutation.isPending}
              >
                {addMutation.isPending ? "Adding..." : "Add rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * Doctor's fraction earnings view
 */
export function DoctorFractionEarnings({ doctorId }: { doctorId?: string }) {
  const { user } = useAuth();
  const targetId = doctorId || user?.id;

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['fraction-earnings', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('doctor_fraction_earnings')
        .select('*')
        .eq('doctor_id', targetId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as FractionEarning[]) || [];
    },
    enabled: !!targetId,
  });

  const totalPending = (earnings || [])
    .filter(e => e.status === 'pending' || e.status === 'approved')
    .reduce((sum, e) => sum + Number(e.doctor_amount), 0);
  
  const totalPaid = (earnings || [])
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.doctor_amount), 0);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading earnings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Fraction Earnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold">K{totalPending.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-xl font-bold text-green-600">K{totalPaid.toFixed(2)}</p>
          </div>
        </div>
        
        {(!earnings || earnings.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fraction earnings yet.
          </p>
        ) : (
          <div className="space-y-2">
            {earnings.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div>
                  <p className="font-medium">{e.procedure_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.doctor_percentage}% of K{Number(e.gross_amount).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">K{Number(e.doctor_amount).toFixed(2)}</p>
                  <Badge 
                    variant={e.status === 'paid' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {e.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
