
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, DollarSign, CreditCard, ShieldCheck } from "lucide-react";

export const WalletTopUp = () => {
    const { user } = useAuth();
    const [amount, setAmount] = useState<string>('50');
    const [isLoading, setIsLoading] = useState(false);

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
            console.log('Initiating PayPal top-up for:', { amount: numAmount, userId: user.id });

            const { data, error } = await supabase.functions.invoke('process-paypal-payment', {
                body: {
                    amount: numAmount,
                    currency: 'USD',
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
                // Redirect to PayPal approval URL
                window.location.href = data.paymentUrl;
            } else {
                throw new Error(data?.error || "Failed to initiate PayPal payment");
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
                    Add funds to your wallet using PayPal
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                                ${q}
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
                        Your payment is processed securely via PayPal. Funds will be available in your wallet immediately after successful payment.
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
                            Pay with PayPal
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
