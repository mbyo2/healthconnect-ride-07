
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, DollarSign, CreditCard, ShieldCheck } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useDPOPayment } from "@/hooks/useDPOPayment";

type PaymentMethod = 'paypal' | 'dpo';

export const WalletTopUp = () => {
    const { user } = useAuth();
    const [amount, setAmount] = useState<string>('50');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dpo');
    const { currency, getSymbol } = useCurrency();
    const { redirectToCheckout: redirectToDPOCheckout } = useDPOPayment();

    const handleTopUp = async () => {
        if (!user) {
            toast.error("You must be logged in to top up your wallet");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsLoading(true);
        try {
            if (paymentMethod === 'paypal') {
                console.log('Initiating PayPal top-up for:', { amount: numAmount, userId: user.id });

                const { data, error } = await supabase.functions.invoke('process-paypal-payment', {
                    body: {
                        amount: numAmount,
                        currency,
                        patientId: user.id,
                        providerId: '00000000-0000-0000-0000-000000000000', // System/Platform provider ID
                        serviceId: 'wallet_topup',
                        redirectUrl: `${window.location.origin}/payment-success`,
                        paymentMethod: 'paypal'
                    }
                });

                if (error) throw error;

                if (data && data.success && data.paymentUrl) {
                    toast.success("Redirecting to PayPal...");
                    window.location.href = data.paymentUrl;
                } else {
                    throw new Error(data?.error || "Failed to initiate PayPal payment");
                }
            } else if (paymentMethod === 'dpo') {
                console.log('Initiating DPO top-up for:', { amount: numAmount, userId: user.id });

                const profile = await supabase.from('profiles').select('first_name, last_name, phone').eq('id', user.id).single();
                
                await redirectToDPOCheckout({
                    amount: numAmount,
                    currency: currency || 'ZMW',
                    reference_type: 'wallet_topup',
                    reference_id: user.id,
                    description: 'Wallet Top Up',
                    customer_first_name: profile.data?.first_name || '',
                    customer_last_name: profile.data?.last_name || '',
                    customer_phone: profile.data?.phone || '',
                    redirect_url: `${window.location.origin}/payment-return`,
                });

            }
        } catch (error) {
            console.error('Top up error:', error);
            toast.error(error instanceof Error ? error.message : "Failed to initiate top up");
        } finally {
            setIsLoading(false);
        }
    };

    const quickAmounts = ['10', '20', '50', '100', '200', '500'];

    return (
        <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Top Up Wallet
                </CardTitle>
                <CardDescription>
                    Add funds to your wallet using DPO Pay (card & mobile money)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-sm font-semibold text-muted-foreground">Select Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2 space-y-0">
                            <RadioGroupItem value="paypal" id="paypal" />
                            <Label htmlFor="paypal" className="font-normal cursor-pointer">PayPal</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-y-0">
                            <RadioGroupItem value="dpo" id="dpo" />
                            <Label htmlFor="dpo" className="font-normal cursor-pointer">DPO Pay</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-4">
                    <Label htmlFor="amount" className="text-sm font-semibold text-muted-foreground">Select or enter amount</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {quickAmounts.map((q) => (
                            <Button
                                key={q}
                                variant={amount === q ? "default" : "outline"}
                                className={`h-12 font-bold transition-all ${amount === q
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                                    : 'bg-secondary hover:bg-secondary/80 border-border'
                                    }`}
                                onClick={() => setAmount(q)}
                            >
                                {getSymbol()}{q}
                            </Button>
                        ))}
                    </div>

                    <div className="relative mt-4">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            id="amount"
                            type="number"
                            placeholder="Enter custom amount"
                            className="pl-10 h-12 text-lg font-bold border-border focus:ring-primary bg-background"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                        <ShieldCheck className="h-4 w-4" />
                        Secure Payment
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Your payment is processed securely via DPO Pay. Supports card payments and mobile money (MTN, Airtel, etc.). Funds will be available in your wallet immediately after successful payment.
                    </p>
                </div>

                <Button
                    className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                    onClick={handleTopUp}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            Pay with {paymentMethod === 'paypal' ? 'PayPal' : 'DPO Pay'}
                        </>
                    )}
                </Button>

                <div className="flex justify-center gap-4 opacity-40 grayscale">
                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal" className="h-6" />
                    <img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/cc-badges-ppmcvdam.png" alt="Cards" className="h-6" />
                </div>
            </CardContent>
        </Card>
    );
};
