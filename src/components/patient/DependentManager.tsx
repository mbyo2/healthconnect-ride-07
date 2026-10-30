import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export interface Dependent {
  id: string;
  guardian_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  relationship: string;
  is_active: boolean;
}

const RELATIONSHIPS = ["child", "spouse", "parent", "sibling", "other"];

function ageLabel(dob: string | null): string {
  if (!dob) return "";
  const years = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)
  );
  if (years < 1) {
    const months = Math.floor(
      (Date.now() - new Date(dob).getTime()) / (30.44 * 86400000)
    );
    return `${months} mo`;
  }
  return `${years} yrs`;
}

/**
 * Family / dependent management (Zocdoc parity).
 * Guardians add children, spouse, parents — then book appointments for them.
 */
export default function DependentManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "male",
    relationship: "child",
  });

  const { data: dependents, isLoading } = useQuery({
    queryKey: ["my-dependents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("patient_dependents")
        .select("*")
        .eq("guardian_id", user.id)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data as Dependent[]) || [];
    },
    enabled: !!user?.id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        throw new Error("First and last name are required");
      }
      const { error } = await supabase.from("patient_dependents").insert({
        guardian_id: user!.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        relationship: form.relationship,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-dependents", user?.id] });
      setShowAdd(false);
      setForm({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "male",
        relationship: "child",
      });
      toast.success("Family member added");
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Failed to add family member")),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_dependents")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-dependents", user?.id] });
      toast.success("Family member removed");
    },
    onError: () => toast.error("Failed to remove family member"),
  });

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            My Family
            <Badge variant="secondary">{dependents?.length || 0}</Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add family
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading family members...</p>
        ) : !dependents || dependents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No family members yet. Add your children, spouse or parents to book
            appointments for them.
          </p>
        ) : (
          dependents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3 rounded-xl border"
            >
              <div>
                <p className="text-sm font-bold">
                  {d.first_name} {d.last_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {d.relationship}
                  {d.date_of_birth && ` · ${ageLabel(d.date_of_birth)}`}
                  {d.gender && ` · ${d.gender}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeMutation.mutate(d.id)}
                aria-label={`Remove ${d.first_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a family member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">First name *</label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last name *</label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Relationship</label>
                <Select
                  value={form.relationship}
                  onValueChange={(v) => setForm({ ...form, relationship: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date of birth</label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? "Adding..." : "Add family member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
