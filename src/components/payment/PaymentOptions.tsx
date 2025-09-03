import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeleHealthPayment } from "./TeleHealthPayment";
import { PayPalPayment } from "./PayPalPayment";
import { Wallet, CreditCard } from "lucide-react";

export interface PaymentOptionsProps {
  amount: number;
  consultationTitle?: string;
  consultationDuration?: number;
  patientId: string;
  providerId: string;
  serviceId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const PaymentOptions = (props: PaymentOptionsProps) => {
  const [activeTab, setActiveTab] = useState("wallet");

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Choose Payment Method</CardTitle>
        <CardDescription>
          Select your preferred payment option
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="paypal" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              PayPal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="wallet" className="mt-4">
            <TeleHealthPayment {...props} />
          </TabsContent>
          
          <TabsContent value="paypal" className="mt-4">
            <PayPalPayment {...props} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};