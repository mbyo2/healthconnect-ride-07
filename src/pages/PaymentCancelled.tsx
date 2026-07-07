import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <XCircle className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Payment cancelled</h1>
        <p className="text-sm text-muted-foreground">You cancelled the payment. No charge was made.</p>
        <div className="flex flex-col gap-2 pt-4">
          <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </Card>
    </div>
  );
}
