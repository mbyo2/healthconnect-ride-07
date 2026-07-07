import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

interface DPOPayment {
  id: string;
  user_id: string;
  reference_type: string;
  reference_id: string | null;
  amount: number;
  currency: string;
  status: string;
  trans_token: string | null;
  trans_ref: string | null;
  result_code: string | null;
  result_explanation: string | null;
  created_at: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
};

export function DPOPaymentsAdmin() {
  const [rows, setRows] = useState<DPOPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("dpo_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setRows((data as DPOPayment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.trans_ref?.toLowerCase().includes(s) ||
      r.trans_token?.toLowerCase().includes(s) ||
      r.reference_type.toLowerCase().includes(s) ||
      r.status.toLowerCase().includes(s)
    );
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.all += Number(r.amount) || 0;
      if (r.status === "paid") acc.paid += Number(r.amount) || 0;
      return acc;
    },
    { all: 0, paid: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">DPO Pay transactions</h2>
          <p className="text-sm text-muted-foreground">
            Sandbox environment · {rows.length} recent · Paid total {totals.paid.toFixed(2)} · Attempted total {totals.all.toFixed(2)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by reference, token, type, status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Code</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">{format(new Date(r.created_at), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.trans_ref || "—"}</td>
                  <td className="px-4 py-2">{r.reference_type}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {Number(r.amount).toFixed(2)} {r.currency}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant[r.status] || "outline"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.result_code || "—"} {r.result_explanation ? `· ${r.result_explanation}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default DPOPaymentsAdmin;
