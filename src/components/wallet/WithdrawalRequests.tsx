import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Banknote, Plus, Clock } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

/**
 * Provider self-service withdrawal requests.
 * Replaces the "arranged through finance" manual process.
 */
export const WithdrawalRequests = ({ walletBalance = 0 }: { walletBalance?: number }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mobile_money" | "bank_transfer">("mobile_money");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("provider_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    try {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        toast.error("Enter a valid amount");
        return;
      }
      if (amt > walletBalance) {
        toast.error(`Amount exceeds your balance of K${walletBalance.toFixed(2)}`);
        return;
      }
      if (amt < 50) {
        toast.error("Minimum withdrawal is K50");
        return;
      }

      let payoutDetails: any;
      if (method === "mobile_money") {
        if (!phone.trim()) {
          toast.error("Enter your mobile money number");
          return;
        }
        payoutDetails = { phone_number: phone.trim() };
      } else {
        if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
          toast.error("Fill in all bank details");
          return;
        }
        payoutDetails = {
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
        };
      }

      setSubmitting(true);
      const { error } = await supabase.from("withdrawal_requests").insert({
        provider_id: user?.id,
        amount: amt,
        currency: "ZMW",
        payout_method: method,
        payout_details: payoutDetails,
        status: "pending",
      });

      if (error) throw error;

      window.dispatchEvent(new CustomEvent("app-feedback", {
        detail: { type: "success", title: "Withdrawal requested", description: `K${amt.toFixed(2)} — finance will process it soon.` }
      }));

      setShowDialog(false);
      setAmount("");
      setPhone("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      fetchRequests();
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast.error("Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Withdrawal cancelled");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to cancel");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-blue-600" />
            Withdrawals
          </CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Available: <span className="font-bold text-gray-900">K{walletBalance.toFixed(2)}</span>
                </p>
                <div>
                  <Label>Amount (K)</Label>
                  <Input
                    type="number"
                    min="50"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Min K50"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Payout method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money (MTN/Airtel/Zamtel)</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {method === "mobile_money" ? (
                  <div>
                    <Label>Mobile number</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="097XXXXXXX"
                      className="mt-1"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Bank name</Label>
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Account number</Label>
                      <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Account name</Label>
                      <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="mt-1" />
                    </div>
                  </>
                )}
                <Button
                  onClick={submitRequest}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No withdrawal requests yet.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <p className="font-semibold text-sm">K{Number(req.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(req.created_at).toLocaleDateString()} · {req.payout_method.replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[req.status] || "bg-gray-100"}>
                    {req.status}
                  </Badge>
                  {req.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => cancelRequest(req.id)} className="text-xs">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
