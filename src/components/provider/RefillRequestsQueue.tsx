import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, Pill } from "lucide-react";
import { toast } from "sonner";

/**
 * Provider-side refill request queue: approve or deny patient refill requests.
 */
export const RefillRequestsQueue = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prescription_refill_requests")
        .select(`
          *,
          prescription:prescription_id (
            id, medication_name, dosage, quantity, refills_remaining
          )
        `)
        .eq("provider_id", user?.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Enrich with patient names from profiles (provider_directory only has clinicians)
      const patientIds = Array.from(new Set((data || []).map((r: any) => r.patient_id).filter(Boolean)));
      let patientMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", patientIds);
        (patients || []).forEach((p: any) => { patientMap[p.id] = p; });
      }

      setRequests((data || []).map((r: any) => ({
        ...r,
        patient: patientMap[r.patient_id],
      })));
    } catch (error) {
      console.error("Error fetching refill requests:", error);
      toast.error("Failed to load refill requests");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (requestId: string, approved: boolean) => {
    try {
      setProcessing(requestId);
      const note = notes[requestId]?.trim() || null;

      const { error } = await supabase
        .from("prescription_refill_requests")
        .update({
          status: approved ? "approved" : "denied",
          provider_note: note,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, increment refills_remaining on the prescription
      if (approved) {
        const req = requests.find((r) => r.id === requestId);
        if (req?.prescription) {
          await supabase
            .from("comprehensive_prescriptions")
            .update({
              refills_remaining: (req.prescription.refills_remaining || 0) + 1,
            })
            .eq("id", req.prescription_id);
        }
      }

      window.dispatchEvent(new CustomEvent("app-feedback", {
        detail: {
          type: "success",
          title: approved ? "Refill approved" : "Refill denied",
          description: approved ? "Patient notified." : "Patient notified with your note.",
        }
      }));

      // REAL patient notification (was just a toast claiming notification)
      try {
        const req = requests.find((r) => r.id === requestId);
        if (req?.patient_id) {
          await supabase.from("notifications").insert({
            user_id: req.patient_id,
            title: approved ? "Refill request approved" : "Refill request denied",
            message: approved
              ? `Your refill request for ${req.prescription?.medication_name || "your medication"} was approved.${note ? ` Note: ${note}` : ""}`
              : `Your refill request was denied.${note ? ` Reason: ${note}` : " Contact your provider for alternatives."}`,
            type: "prescription",
            reference_id: requestId,
            created_at: new Date().toISOString(),
          });
          // Push notification (best-effort)
          supabase.functions.invoke("send-push", {
            body: {
              userIds: [req.patient_id],
              title: approved ? "Refill approved" : "Refill denied",
              body: approved ? "Your medication refill was approved." : "Your refill request was denied. Check the app for details.",
              url: "/prescriptions",
              tag: "refill",
            },
          }).catch(() => {});
        }
      } catch (notifErr) {
        console.error("Refill notification failed (non-fatal):", notifErr);
      }

      // Remove from queue
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setNotes((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    } catch (error) {
      console.error("Error deciding refill:", error);
      toast.error("Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Loading refill requests…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-5 w-5 text-blue-600" />
          Refill Requests
          {requests.length > 0 && (
            <Badge className="bg-blue-600 text-white ml-2">{requests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No pending refill requests.
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {req.patient ? `${req.patient.first_name} ${req.patient.last_name}` : "Patient"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.prescription?.medication_name} {req.prescription?.dosage}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {req.prescription?.quantity} · Refills left: {req.prescription?.refills_remaining ?? 0}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(req.created_at).toLocaleDateString()}
                  </Badge>
                </div>

                <Textarea
                  placeholder="Note to patient (optional)…"
                  value={notes[req.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  className="text-sm"
                  rows={2}
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide(req.id, true)}
                    disabled={processing === req.id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(req.id, false)}
                    disabled={processing === req.id}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Deny
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
