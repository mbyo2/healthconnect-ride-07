import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Siren } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BreakGlassDialogProps {
  patientId: string;
  patientName: string;
  onGranted?: () => void;
  triggerLabel?: string;
}

/**
 * Epic-style break-the-glass emergency access.
 * Clinical staff can override patient-access restrictions in a genuine emergency
 * by providing a mandatory reason. The grant lasts 4 hours and is fully audited.
 */
export function BreakGlassDialog({ patientId, patientName, onGranted, triggerLabel }: BreakGlassDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = reason.trim().length >= 10 && confirmUnderstood && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("request_break_glass_access", {
        p_patient_id: patientId,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      toast.success("Emergency access granted for 4 hours. This access is audit-logged.", {
        description: `Patient: ${patientName}`,
      });
      setOpen(false);
      setReason("");
      setConfirmUnderstood(false);
      onGranted?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to grant emergency access");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Siren className="h-4 w-4" />
          {triggerLabel || "Emergency Access"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Break-the-Glass Emergency Access
          </DialogTitle>
          <DialogDescription>
            You are about to override normal access controls for <strong>{patientName}</strong>.
            This is for genuine clinical emergencies only. Every access is logged, time-limited
            to 4 hours, and reviewed by administrators.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bg-reason">Emergency reason (required, min 10 characters)</Label>
            <Textarea
              id="bg-reason"
              placeholder="e.g. Patient arrived unconscious in ED, no prior relationship, need allergy and medication history immediately to treat safely."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{reason.trim().length}/10 minimum characters</p>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={confirmUnderstood}
              onChange={(e) => setConfirmUnderstood(e.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm this is a genuine clinical emergency and I understand this access
              will be audit-logged and reviewed.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Granting..." : "Grant Emergency Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
