import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

/**
 * Admin: review withdrawal requests, approve/reject, and trigger Lenco payout.
 */
export const WithdrawalAdminQueue = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Enrich with provider names
      const providerIds = Array.from(new Set((data || []).map((r: any) => r.provider_id).filter(Boolean)));
      let providerMap: Record<string, any> = {};
      if (providerIds.length > 0) {
        const { data: providers } = await supabase
          .from("provider_directory")
          .select("id, first_name, last_name")
          .in("id", providerIds);
        (providers || []).forEach((p: any) => { providerMap[p.id] = p; });
      }

      setRequests((data || []).map((r: any) => ({
        ...r,
        provider: providerMap[r.provider_id],
      })));
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (id: string, approved: boolean) => {
    try {
      setProcessing(id);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: approved ? "approved" : "rejected",
          admin_note: notes[id]?.trim() || null,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(approved ? "Withdrawal approved — ready for payout" : "Withdrawal rejected");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to process");
    } finally {
      setProcessing(null);
    }
  };

  const processPayout = async (id: string) => {
    try {
      setProcessing(id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lenco-process-payout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ withdrawal_id: id }),
        }
      );

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Payout failed");

      toast.success(`Payout sent (${json.reference})`);
      window.dispatchEvent(new CustomEvent("app-feedback", {
        detail: { type: "success", title: "Payout sent!", description: `K${requests.find(r => r.id === id)?.amount} on the way` }
      }));
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Payout failed");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6 text-center text-sm">Loading…</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-blue-600" />
          Withdrawal Payouts
          {requests.length > 0 && <Badge className="bg-blue-600 text-white ml-2">{requests.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No pending withdrawals.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const details = req.payout_details as any;
              return (
                <div key={req.id} className="border rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {req.provider ? `${req.provider.first_name} ${req.provider.last_name}` : "Provider"}
                      </p>
                      <p className="text-lg font-bold text-blue-600">K{Number(req.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.payout_method === "mobile_money"
                          ? `Mobile: ${details.phone_number}`
                          : `Bank: ${details.bank_name} ${details.account_number}`}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[req.status]}>{req.status}</Badge>
                  </div>

                  {req.status === "pending" && (
                    <>
                      <Textarea
                        placeholder="Admin note (optional)…"
                        value={notes[req.id] || ""}
                        onChange={(e) => setNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decide(req.id, true)} disabled={processing === req.id} className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(req.id, false)} disabled={processing === req.id} className="flex-1 text-red-600">
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </>
                  )}

                  {req.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => processPayout(req.id)}
                      disabled={processing === req.id}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {processing === req.id ? "Sending…" : "Send Payout"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
