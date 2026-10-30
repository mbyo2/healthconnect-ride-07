import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { friendlyErrorMessage } from "@/utils/friendly-error";

interface Referral {
  id: string;
  patient_id: string;
  referring_doctor_id: string;
  referred_to_doctor: string | null;
  referred_to_department: string | null;
  reason_for_referral: string;
  diagnosis: string | null;
  priority: string | null;
  status: string | null;
  referral_date: string;
  outcome_status: string | null;
  feedback_notes: string | null;
  treatment_summary: string | null;
  feedback_at: string | null;
}

const OUTCOMES = [
  { value: "seen", label: "Seen" },
  { value: "treated", label: "Treated" },
  { value: "admitted", label: "Admitted" },
  { value: "procedure_done", label: "Procedure done" },
  { value: "discharged", label: "Discharged" },
  { value: "declined", label: "Declined (can't accept)" },
  { value: "patient_did_not_arrive", label: "Patient did not arrive" },
];

const outcomeLabel = (v: string | null) =>
  OUTCOMES.find((o) => o.value === v)?.label || v || "";

/**
 * Referral Feedback Loop — closes the referral cycle.
 * Receiving side: referrals sent TO me; I submit the outcome and the
 * referring doctor gets notified.
 * Sending side: referrals I made, showing the feedback that came back.
 */
export default function ReferralFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [giving, setGiving] = useState<Referral | null>(null);
  const [form, setForm] = useState({ outcome_status: "seen", feedback_notes: "", treatment_summary: "" });

  // Referrals sent to me (I'm the receiving doctor)
  const { data: incoming, isLoading: loadingIn } = useQuery({
    queryKey: ["referrals-incoming", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referred_to_doctor", user.id)
        .order("referral_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as Referral[]) || [];
    },
    enabled: !!user?.id,
  });

  // Referrals I sent
  const { data: outgoing, isLoading: loadingOut } = useQuery({
    queryKey: ["referrals-outgoing", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referring_doctor_id", user.id)
        .order("referral_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as Referral[]) || [];
    },
    enabled: !!user?.id,
  });

  const feedbackMutation = useMutation({
    mutationFn: async (referral: Referral) => {
      if (!form.outcome_status) throw new Error("Select an outcome");
      const { error } = await supabase
        .from("referrals")
        .update({
          outcome_status: form.outcome_status,
          feedback_notes: form.feedback_notes.trim() || null,
          treatment_summary: form.treatment_summary.trim() || null,
          feedback_by: user!.id,
          feedback_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", referral.id);
      if (error) throw error;

      // Notify the referring doctor (notifications has no related_id column)
      await supabase.from("notifications").insert({
        user_id: referral.referring_doctor_id,
        title: "Referral feedback received",
        message: `Outcome for your referral (${referral.reason_for_referral}): ${outcomeLabel(form.outcome_status)}.${form.feedback_notes ? ` Notes: ${form.feedback_notes.slice(0, 120)}` : ""}`,
        type: "referral_feedback",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals-incoming", user?.id] });
      setGiving(null);
      setForm({ outcome_status: "seen", feedback_notes: "", treatment_summary: "" });
      toast.success("Feedback sent to the referring doctor");
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Failed to send feedback")),
  });

  if (!user) return null;
  const isLoading = loadingIn || loadingOut;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRight className="h-4 w-4" />
          Referral Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading referrals...</p>
        ) : (
          <>
            {/* Incoming: needs my feedback */}
            <div>
              <p className="text-sm font-semibold mb-2">Referred to me</p>
              {(!incoming || incoming.length === 0) ? (
                <p className="text-sm text-muted-foreground">No referrals sent to you.</p>
              ) : (
                <div className="space-y-2">
                  {incoming.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border">
                      <div>
                        <p className="text-sm font-medium">{r.reason_for_referral}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.referral_date).toLocaleDateString("en-GB")}
                          {r.diagnosis && ` · ${r.diagnosis}`}
                          {r.priority && ` · ${r.priority}`}
                        </p>
                        {r.feedback_at && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Feedback given: {outcomeLabel(r.outcome_status)}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant={r.feedback_at ? "outline" : "default"} onClick={() => setGiving(r)}>
                        <Send className="h-3 w-3 mr-1" />
                        {r.feedback_at ? "Update" : "Give feedback"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing: feedback received */}
            <div>
              <p className="text-sm font-semibold mb-2">My referrals — feedback received</p>
              {(!outgoing || outgoing.length === 0) ? (
                <p className="text-sm text-muted-foreground">You haven't made any referrals.</p>
              ) : (
                <div className="space-y-2">
                  {outgoing.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{r.reason_for_referral}</p>
                        {r.feedback_at ? (
                          <Badge>{outcomeLabel(r.outcome_status)}</Badge>
                        ) : (
                          <Badge variant="secondary">Awaiting feedback</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.referral_date).toLocaleDateString("en-GB")}
                        {r.referred_to_department && ` · to ${r.referred_to_department}`}
                      </p>
                      {r.feedback_at && (
                        <div className="mt-2 text-xs space-y-1">
                          {r.treatment_summary && (
                            <p><span className="font-semibold">Treatment:</span> {r.treatment_summary}</p>
                          )}
                          {r.feedback_notes && (
                            <p><span className="font-semibold">Notes:</span> {r.feedback_notes}</p>
                          )}
                          <p className="text-muted-foreground">
                            Feedback {new Date(r.feedback_at).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={!!giving} onOpenChange={(o) => !o && setGiving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Referral feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {giving?.reason_for_referral}
              {giving?.diagnosis && ` — ${giving.diagnosis}`}
            </p>
            <div>
              <label className="text-sm font-medium">Outcome *</label>
              <Select
                value={form.outcome_status}
                onValueChange={(v) => setForm({ ...form, outcome_status: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Treatment summary</label>
              <Textarea
                value={form.treatment_summary}
                onChange={(e) => setForm({ ...form, treatment_summary: e.target.value })}
                placeholder="What was done for the patient..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes for the referring doctor</label>
              <Textarea
                value={form.feedback_notes}
                onChange={(e) => setForm({ ...form, feedback_notes: e.target.value })}
                placeholder="Findings, follow-up plan, anything the referrer should know..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGiving(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => giving && feedbackMutation.mutate(giving)}
                disabled={feedbackMutation.isPending}
              >
                {feedbackMutation.isPending ? "Sending..." : "Send feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
