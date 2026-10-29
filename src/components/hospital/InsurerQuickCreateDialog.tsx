import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export interface InsurerOption {
  id: string;
  name: string;
  code: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from the search text the user typed (the missing insurer). */
  initialName?: string;
  onCreated: (insurer: InsurerOption) => void;
}

const toInsurerCode = (name: string) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "INSURER";

/**
 * Create-on-missing for payers/insurers (CEO Odoo rule, Patient Unity
 * W4): adds an insurer to the platform directory from inside the claims
 * workflow and resumes with it selected. Directory writes are
 * service-role-only at the policy level, so creation goes through the
 * create_insurance_provider RPC, which enforces the platform-admin
 * gate server-side (has_admin_scope). Callers only offer this dialog
 * to platform admins; everyone else can still type the insurer's name
 * on the claim, as before.
 */
export const InsurerQuickCreateDialog = ({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: Props) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const n = initialName.trim();
      setName(n);
      setCode(n ? toInsurerCode(n) : "");
    }
  }, [open, initialName]);

  const handleSave = async () => {
    const insurerName = name.trim();
    if (!insurerName) {
      toast.error("Give the insurer a name");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_insurance_provider', {
        p_name: insurerName,
        p_code: code.trim() || toInsurerCode(insurerName),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('Insurer was not created');
      const insurer = row as InsurerOption;
      toast.success(`“${insurerName}” added to the insurer directory and selected`);
      onOpenChange(false);
      onCreated(insurer);
    } catch (e: any) {
      toast.error(
        "That insurer could not be added. Only a platform admin can change the insurer directory — you can still type the insurer's name on the claim."
      );
      console.error("InsurerQuickCreate failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5" /> Add insurer
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            This insurer is not in the directory yet. Add it now and the claim
            continues with it — no need to leave this workflow.
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ins-name">Insurer name *</Label>
            <Input
              id="ins-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setCode(toInsurerCode(e.target.value));
              }}
              placeholder="e.g. NHIMA"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ins-code">Code</Label>
            <Input
              id="ins-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="NHIMA"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <ShieldPlus className="h-4 w-4 mr-1" />
            {saving ? "Adding…" : "Add & select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InsurerQuickCreateDialog;
