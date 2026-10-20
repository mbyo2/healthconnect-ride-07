import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Problem List / Active Conditions (Epic parity)
 * Tracks patient's active medical problems/conditions.
 * Standard EHR feature for clinical decision-making.
 */

interface PatientCondition {
  id: string;
  condition_name: string;
  condition_type: string;
  diagnosis_date: string;
  severity: string | null;
  status: string | null;
  treatment_plan: string | null;
  notes: string | null;
  diagnosed_by: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  severe: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  critical: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  chronic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_remission: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

export function ProblemList({ patientId, canEdit = false }: { 
  patientId: string; 
  canEdit?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    condition_name: "",
    condition_type: "diagnosis",
    severity: "moderate",
    status: "active",
    treatment_plan: "",
    notes: "",
  });

  const { data: conditions, isLoading } = useQuery({
    queryKey: ['problem-list', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_conditions')
        .select('*')
        .eq('patient_id', patientId)
        .order('diagnosis_date', { ascending: false });
      if (error) throw error;
      return (data as PatientCondition[]) || [];
    },
    enabled: !!patientId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!formData.condition_name.trim()) throw new Error("Condition name required");
      const { error } = await supabase
        .from('patient_conditions')
        .insert({
          patient_id: patientId,
          condition_name: formData.condition_name.trim(),
          condition_type: formData.condition_type,
          severity: formData.severity,
          status: formData.status,
          treatment_plan: formData.treatment_plan.trim() || null,
          notes: formData.notes.trim() || null,
          diagnosed_by: user?.id,
          diagnosis_date: new Date().toISOString().split('T')[0],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem-list', patientId] });
      setShowAdd(false);
      setFormData({
        condition_name: "",
        condition_type: "diagnosis",
        severity: "moderate",
        status: "active",
        treatment_plan: "",
        notes: "",
      });
      toast.success("Problem added to list");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to add problem");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patient_conditions')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem-list', patientId] });
      toast.success("Marked as resolved");
    },
    onError: () => {
      toast.error("Failed to mark as resolved");
    },
  });

  const activeConditions = (conditions || []).filter(c => 
    c.status === 'active' || c.status === 'chronic' || !c.status
  );
  const resolvedConditions = (conditions || []).filter(c => 
    c.status === 'resolved' || c.status === 'in_remission'
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading problem list...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Problem List
            {activeConditions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeConditions.length} active
              </Badge>
            )}
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add problem
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeConditions.length === 0 && resolvedConditions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No problems recorded.
          </p>
        ) : (
          <>
            {activeConditions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Active ({activeConditions.length})
                </p>
                {activeConditions.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{c.condition_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Diagnosed {format(new Date(c.diagnosis_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {c.severity && (
                          <Badge className={cn("text-xs", SEVERITY_COLORS[c.severity] || "")}>
                            {c.severity}
                          </Badge>
                        )}
                        {c.status && (
                          <Badge className={cn("text-xs", STATUS_COLORS[c.status] || "")}>
                            {c.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {c.treatment_plan && (
                      <p className="text-xs bg-muted/50 rounded p-2">
                        <span className="font-medium">Plan:</span> {c.treatment_plan}
                      </p>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMutation.mutate(c.id)}
                        disabled={resolveMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark resolved
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {resolvedConditions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resolved / In remission ({resolvedConditions.length})
                </p>
                {resolvedConditions.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border opacity-60">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm line-through">{c.condition_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {c.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to problem list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Condition name *</label>
              <Input
                value={formData.condition_name}
                onChange={(e) => setFormData({ ...formData, condition_name: e.target.value })}
                placeholder="e.g., Type 2 Diabetes, Hypertension"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.condition_type}
                  onValueChange={(v) => setFormData({ ...formData, condition_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnosis">Diagnosis</SelectItem>
                    <SelectItem value="symptom">Symptom</SelectItem>
                    <SelectItem value="finding">Finding</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={formData.severity}
                  onValueChange={(v) => setFormData({ ...formData, severity: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Treatment plan</label>
              <Textarea
                value={formData.treatment_plan}
                onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                placeholder="Treatment approach..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!formData.condition_name.trim() || addMutation.isPending}
              >
                {addMutation.isPending ? "Adding..." : "Add problem"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
