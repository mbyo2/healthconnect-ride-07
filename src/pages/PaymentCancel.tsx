import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              You can try again with a different payment method or contact support if you need assistance.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate(-1)}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;