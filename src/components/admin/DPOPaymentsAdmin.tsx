import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  redirect_url?: string | null;
  result_code: string | null;
  result_explanation: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
};

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`col-span-2 text-sm break-all ${mono ? "font-mono" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

export function DPOPaymentsAdmin() {
  const [rows, setRows] = useState<DPOPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<DPOPayment | null>(null);

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
    // Deep-link support: /superadmin?dpo=<paymentId>
    const url = new URL(window.location.href);
    const id = url.searchParams.get("dpo");
    if (id) {
      (async () => {
        const { data } = await (supabase as any)
          .from("dpo_payments")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (data) setSelected(data as DPOPayment);
      })();
    }
  }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.trans_ref?.toLowerCase().includes(s) ||
      r.trans_token?.toLowerCase().includes(s) ||
      r.reference_type.toLowerCase().includes(s) ||
      r.status.toLowerCase().includes(s) ||
      r.reference_id?.toLowerCase().includes(s)
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
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
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
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction details</DialogTitle>
            <DialogDescription>
              Full DPO Pay record and result codes for this transaction.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-1">
              <Row label="Status" value={<Badge variant={statusVariant[selected.status] || "outline"}>{selected.status}</Badge>} />
              <Row label="Amount" value={`${Number(selected.amount).toFixed(2)} ${selected.currency}`} />
              <Row label="Reference type" value={selected.reference_type} />
              <Row label="Reference ID" value={selected.reference_id} mono />
              <Row label="Trans ref" value={selected.trans_ref} mono />
              <Row label="Trans token" value={selected.trans_token} mono />
              <Row label="Result code" value={selected.result_code} mono />
              <Row label="Result explanation" value={selected.result_explanation} />
              <Row label="User ID" value={selected.user_id} mono />
              <Row label="Payment ID" value={selected.id} mono />
              <Row label="Created" value={format(new Date(selected.created_at), "PPpp")} />
              {selected.updated_at && (
                <Row label="Updated" value={format(new Date(selected.updated_at), "PPpp")} />
              )}
              {selected.redirect_url && (
                <Row
                  label="Hosted checkout"
                  value={
                    <a href={selected.redirect_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Open link
                    </a>
                  }
                />
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="pt-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Metadata</div>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DPOPaymentsAdmin;
