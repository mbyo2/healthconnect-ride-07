import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Plus, Wifi, WifiOff, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORTED_MACHINES, parseHL7ORU } from "@/utils/hl7-parser";
import { cn } from "@/lib/utils";
import { friendlyErrorMessage } from "@/utils/friendly-error";

/**
 * LIS Machine Management (Danphe parity)
 * Register lab analyzers, configure HL7/ASTM integration, view incoming results.
 */

interface LISMachine {
  id: string;
  machine_name: string;
  manufacturer: string;
  model: string;
  protocol: string;
  ip_address: string | null;
  port: number | null;
  connection_status: string;
  is_active: boolean;
}

export function LISMachineManager({ institutionId }: { institutionId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    machine_name: "",
    manufacturer: "",
    model: "",
    protocol: "HL7",
    ip_address: "",
    port: "",
  });

  const { data: machines, isLoading } = useQuery({
    queryKey: ['lis-machines', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lis_machines')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as LISMachine[]) || [];
    },
    enabled: !!institutionId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!formData.machine_name || !formData.manufacturer || !formData.model) {
        throw new Error("Machine name, manufacturer, and model are required");
      }
      const { error } = await supabase
        .from('lis_machines')
        .insert({
          institution_id: institutionId,
          machine_name: formData.machine_name,
          manufacturer: formData.manufacturer,
          model: formData.model,
          protocol: formData.protocol,
          ip_address: formData.ip_address || null,
          port: formData.port ? parseInt(formData.port) : null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lis-machines', institutionId] });
      setShowAdd(false);
      setFormData({
        machine_name: "",
        manufacturer: "",
        model: "",
        protocol: "HL7",
        ip_address: "",
        port: "",
      });
      toast.success("LIS machine registered");
    },
    onError: (e: any) => {
      toast.error(friendlyErrorMessage(e, "Failed to register machine"));
    },
  });

  const selectedManufacturer = SUPPORTED_MACHINES.find(
    m => m.manufacturer === formData.manufacturer
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading LIS machines...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            LIS Machines
            <Badge variant="secondary" className="ml-2">
              {machines?.length || 0}
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add machine
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!machines || machines.length === 0) ? (
          <div className="text-center py-6">
            <FlaskConical className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No LIS machines registered.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your lab analyzers to enable automatic result import.
            </p>
          </div>
        ) : (
          machines.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">{m.machine_name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.manufacturer} {m.model} • {m.protocol}
                  {m.ip_address && ` • ${m.ip_address}:${m.port}`}
                </p>
              </div>
              <Badge
                variant={m.connection_status === 'connected' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {m.connection_status === 'connected' ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {m.connection_status}
              </Badge>
            </div>
          ))
        )}
        
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Supported machines:</p>
          <p>Randox, Sysmex, Mindray, Snibe, Horiba, Abbott, Siemens, Roche, Beckman, Erba, Diatron, Medonic</p>
          <p className="mt-2">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Physical network connection requires on-site setup. Contact IT to configure the analyzer's HL7 output to this server.
          </p>
        </div>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register LIS machine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Machine name *</label>
              <Input
                value={formData.machine_name}
                onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
                placeholder="e.g., Main Lab Analyzer"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Manufacturer *</label>
                <Select
                  value={formData.manufacturer}
                  onValueChange={(v) => setFormData({ ...formData, manufacturer: v, model: "" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_MACHINES.map((m) => (
                      <SelectItem key={m.manufacturer} value={m.manufacturer}>
                        {m.manufacturer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Model *</label>
                <Select
                  value={formData.model}
                  onValueChange={(v) => setFormData({ ...formData, model: v })}
                  disabled={!selectedManufacturer}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedManufacturer?.models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Protocol</label>
                <Select
                  value={formData.protocol}
                  onValueChange={(v) => setFormData({ ...formData, protocol: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HL7">HL7</SelectItem>
                    <SelectItem value="ASTM">ASTM</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">IP Address</label>
                <Input
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="192.168.1.100"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Port</label>
                <Input
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  placeholder="2575"
                  type="number"
                  className="mt-1"
                />
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
                {addMutation.isPending ? "Registering..." : "Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
