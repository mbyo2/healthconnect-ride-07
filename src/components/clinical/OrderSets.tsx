import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Plus, FlaskConical, Pill, Stethoscope, Image } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Order Sets (Epic parity)
 * Predefined clinical order templates for common conditions.
 * Clinicians can apply entire sets with one click, selecting/deselecting items.
 */

interface OrderSet {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_system: boolean;
}

interface OrderSetItem {
  id: string;
  item_type: string;
  item_name: string;
  details: Record<string, any>;
  is_optional: boolean;
  display_order: number;
}

const ITEM_ICONS: Record<string, any> = {
  lab: FlaskConical,
  imaging: Image,
  medication: Pill,
  procedure: Stethoscope,
  nursing: ClipboardList,
};

const ITEM_COLORS: Record<string, string> = {
  lab: "text-blue-500",
  imaging: "text-purple-500",
  medication: "text-green-500",
  procedure: "text-orange-500",
  nursing: "text-pink-500",
  diet: "text-yellow-500",
  consult: "text-indigo-500",
};

export function OrderSetPicker({
  onApply,
}: {
  onApply?: (items: OrderSetItem[]) => void;
}) {
  const [selectedSet, setSelectedSet] = useState<OrderSet | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: orderSets, isLoading } = useQuery({
    queryKey: ['order-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_sets')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data as OrderSet[]) || [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ['order-set-items', selectedSet?.id],
    queryFn: async () => {
      if (!selectedSet) return [];
      const { data, error } = await supabase
        .from('order_set_items')
        .select('*')
        .eq('order_set_id', selectedSet.id)
        .order('display_order');
      if (error) throw error;
      return (data as OrderSetItem[]) || [];
    },
    enabled: !!selectedSet,
  });

  const handleSetSelect = (set: OrderSet) => {
    setSelectedSet(set);
    // Pre-select non-optional items
    setSelectedItems(new Set());
  };

  const toggleItem = (itemId: string) => {
    const next = new Set(selectedItems);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItems(next);
  };

  const handleApply = () => {
    const selected = (items || []).filter(i => 
      selectedItems.has(i.id) || !i.is_optional
    );
    onApply?.(selected);
    toast.success(`Applied ${selected.length} orders from ${selectedSet?.name}`);
    setSelectedSet(null);
    setSelectedItems(new Set());
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading order sets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(orderSets || []).map((set) => (
          <Card
            key={set.id}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary",
              selectedSet?.id === set.id && "border-primary bg-primary/5"
            )}
            onClick={() => handleSetSelect(set)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{set.name}</p>
                  {set.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {set.description}
                    </p>
                  )}
                </div>
                {set.is_system && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    System
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-xs mt-2">
                {set.category}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedSet.name} - Select orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(items || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items in this order set yet.
              </p>
            ) : (
              <>
                {(items || []).map((item) => {
                  const Icon = ITEM_ICONS[item.item_type] || ClipboardList;
                  const isSelected = selectedItems.has(item.id) || !item.is_optional;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      {item.is_optional ? (
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                      ) : (
                        <Checkbox checked={true} disabled />
                      )}
                      <Icon className={cn("h-4 w-4 shrink-0", ITEM_COLORS[item.item_type] || "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.item_type}
                          {item.is_optional && " • optional"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setSelectedSet(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleApply}>
                    <Plus className="h-3 w-3 mr-1" />
                    Apply orders
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(!orderSets || orderSets.length === 0) && (
        <Card>
          <CardContent className="pt-6 text-center">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No order sets available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
