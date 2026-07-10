import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useDPOPayment } from "@/hooks/useDPOPayment";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const { verifyToken } = useDPOPayment();
  const [state, setState] = useState<"loading" | "paid" | "failed" | "cancelled" | "pending">("loading");
  const [message, setMessage] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [verifying, setVerifying] = useState(false);

  const transToken = params.get("TransactionToken") || params.get("trans_token");

  const runVerify = useCallback(
    async (silent = false) => {
      if (!transToken) {
        setState("failed");
        setMessage("Missing transaction reference.");
        return;
      }
      if (!silent) setVerifying(true);
      try {
        const r = await verifyToken(transToken);
        setState((r.status as any) || "pending");
        setMessage(r.message || "");
        setCode(r.code || "");
        if (!silent) toast.success("Verification refreshed");
      } catch (e: any) {
        setState("failed");
        setMessage(e?.message || "Verification failed");
        if (!silent) toast.error(e?.message || "Verification failed");
      } finally {
        setVerifying(false);
      }
    },
    [transToken, verifyToken]
  );

  useEffect(() => {
    runVerify(true);
  }, [runVerify]);

  const config = {
    loading: { icon: Loader2, color: "text-muted-foreground", title: "Verifying payment…", spin: true },
    paid: { icon: CheckCircle2, color: "text-primary", title: "Payment successful", spin: false },
    pending: { icon: Clock, color: "text-muted-foreground", title: "Payment pending", spin: false },
    failed: { icon: XCircle, color: "text-destructive", title: "Payment failed", spin: false },
    cancelled: { icon: XCircle, color: "text-muted-foreground", title: "Payment cancelled", spin: false },
  }[state];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <Icon className={`h-16 w-16 mx-auto ${config.color} ${config.spin ? "animate-spin" : ""}`} />
        <h1 className="text-2xl font-semibold">{config.title}</h1>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {(code || transToken) && (
          <div className="text-xs text-muted-foreground font-mono break-all">
            {code && <div>Code: {code}</div>}
            {transToken && <div>Token: {transToken}</div>}
          </div>
        )}
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={() => runVerify(false)} disabled={verifying || !transToken} variant="secondary">
            <RefreshCw className={`h-4 w-4 mr-2 ${verifying ? "animate-spin" : ""}`} />
            {verifying ? "Verifying…" : "Verify payment now"}
          </Button>
          <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
          <Button variant="ghost" asChild><Link to="/">Home</Link></Button>
        </div>
      </Card>
    </div>
  );
}
