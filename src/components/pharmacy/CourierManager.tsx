import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bike, Plus, Pencil, Trash2, X, Phone, Star, Package } from "lucide-react";

interface Courier {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  is_active: boolean;
  is_available: boolean;
  total_deliveries: number;
  rating: number | null;
}

const VEHICLE_TYPES = [
  { value: "motorbike", label: "Motorbike" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "on_foot", label: "On foot" },
];

export const CourierManager = ({ pharmacyId }: { pharmacyId: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    vehicle_type: "motorbike",
    vehicle_plate: "",
  });

  const { data: couriers = [], isLoading } = useQuery({
    queryKey: ["couriers", pharmacyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("couriers")
        .select("*")
        .eq("pharmacy_id", pharmacyId)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as Courier[];
    },
    enabled: !!pharmacyId,
  });

  const resetForm = () => {
    setForm({ full_name: "", phone: "", vehicle_type: "motorbike", vehicle_plate: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    try {
      // Couriers need a user account; for now we create the courier record
      // linked to the pharmacy. The courier signs up separately and claims
      // the profile via phone number.
      const payload = {
        pharmacy_id: pharmacyId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        vehicle_type: form.vehicle_type,
        vehicle_plate: form.vehicle_plate.trim() || null,
        // user_id is set when the courier claims the profile via signup
        user_id: "00000000-0000-0000-0000-000000000000", // placeholder, replaced on claim
      };
      if (editingId) {
        const { error } = await (supabase as any)
          .from("couriers")
          .update({
            full_name: payload.full_name,
            phone: payload.phone,
            vehicle_type: payload.vehicle_type,
            vehicle_plate: payload.vehicle_plate,
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Courier updated");
      } else {
        const { error } = await (supabase as any).from("couriers").insert(payload);
        if (error) throw error;
        toast.success("Courier added. They can claim this profile when they sign up with the same phone number.");
      }
      queryClient.invalidateQueries({ queryKey: ["couriers", pharmacyId] });
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to save courier");
    }
  };

  const startEdit = (c: Courier) => {
    setForm({
      full_name: c.full_name,
      phone: c.phone,
      vehicle_type: c.vehicle_type,
      vehicle_plate: c.vehicle_plate || "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this courier?")) return;
    try {
      const { error } = await (supabase as any)
        .from("couriers")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Courier removed");
      queryClient.invalidateQueries({ queryKey: ["couriers", pharmacyId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove courier");
    }
  };

  const toggleAvailable = async (c: Courier) => {
    try {
      const { error } = await (supabase as any)
        .from("couriers")
        .update({ is_available: !c.is_available })
        .eq("id", c.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["couriers", pharmacyId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update availability");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5" />
              Delivery Riders ({couriers.length})
            </CardTitle>
            <CardDescription>
              Manage your delivery riders. They appear as assignable couriers on orders.
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? "Cancel" : "Add Rider"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg mb-4 bg-muted/30">
            <div>
              <Label>Full name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Mwansa Chanda"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+260..."
              />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select
                value={form.vehicle_type}
                onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plate / ID (optional)</Label>
              <Input
                value={form.vehicle_plate}
                onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
                placeholder="e.g. ALB 1234"
              />
            </div>
            <div className="md:col-span-2">
              <Button onClick={handleSubmit} className="w-full">
                {editingId ? "Save Changes" : "Add Rider"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading riders…</p>
        ) : couriers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            No riders yet. Add your first delivery rider above.
          </p>
        ) : (
          <div className="space-y-2">
            {couriers.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bike className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {c.phone}
                      <span className="capitalize">· {c.vehicle_type.replace("_", " ")}</span>
                      {c.total_deliveries > 0 && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> {c.total_deliveries}
                        </span>
                      )}
                      {c.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {c.rating}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={c.is_available ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleAvailable(c)}
                    title="Click to toggle availability"
                  >
                    {c.is_available ? "Available" : "Off duty"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(c)} aria-label={`Edit ${c.full_name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(c.id)}
                    aria-label={`Remove ${c.full_name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
