
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useLencoPayment, LENCO_OPERATORS, type LencoOperator } from "@/hooks/useLencoPayment";
import { useLencoCardPayment } from "@/hooks/useLencoCardPayment";

type PaymentMethod = 'paypal' | 'lenco' | 'card';

export const WalletTopUp = () => {
    const { user } = useAuth();
    const [amount, setAmount] = useState<string>('50');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('lenco');
    const [lencoPhone, setLencoPhone] = useState('');
    const [lencoOperator, setLencoOperator] = useState<LencoOperator>('mtn');
    const [lencoReference, setLencoReference] = useState<string | null>(null);
    const [lencoMessage, setLencoMessage] = useState<string>('');
    // Card fields
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState(''); // MM/YY
    const [cardCvv, setCardCvv] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardEmail, setCardEmail] = useState('');
    const { currency, getSymbol, toZmw, formatPrice } = useCurrency();
    const { createCollection, verifyPayment, verifying } = useLencoPayment();
    const { payWithCard, loading: cardLoading } = useLencoCardPayment();

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
                // Same ZMW-canonical rule as before: convert display amount first.
                const zmwAmount = Math.round(toZmw(numAmount, currency) * 100) / 100;
                if (!(zmwAmount >= 1)) {
                    toast.error("Top-up must be at least K1.00");
                    setIsLoading(false);
                    return;
                }
                const { data, error } = await supabase.functions.invoke('process-paypal-payment', {
                    body: {
                        amount: zmwAmount,
                        currency: 'ZMW',
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
            } else if (paymentMethod === 'card') {
                // Lenco card collection: JWE-encrypted, PCI-sensitive.
                const zmwAmount = Math.round(toZmw(numAmount, currency) * 100) / 100;
                if (!(zmwAmount >= 1)) {
                    toast.error("Top-up must be at least K1.00");
                    setIsLoading(false);
                    return;
                }
                if (!cardName.trim() || !cardEmail.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
                    toast.error("Please fill in all card details");
                    setIsLoading(false);
                    return;
                }
                const [expMonth, expYear] = cardExpiry.split('/').map(s => s.trim());
                if (!expMonth || !expYear) {
                    toast.error("Enter expiry as MM/YY");
                    setIsLoading(false);
                    return;
                }
                const nameParts = cardName.trim().split(/\s+/);
                const result = await payWithCard({
                    amount: zmwAmount,
                    currency: 'ZMW',
                    reference_type: 'wallet_topup',
                    description: `Wallet top-up K${zmwAmount}`,
                    email: cardEmail.trim(),
                    firstName: nameParts[0],
                    lastName: nameParts.slice(1).join(' ') || nameParts[0],
                    cardNumber: cardNumber.replace(/\D/g, ''),
                    expiryMonth: expMonth.padStart(2, '0'),
                    expiryYear: expYear.length === 2 ? `20${expYear}` : expYear,
                    cvv: cardCvv.trim(),
                });
                if (result) {
                    if (result.status === '3ds_required' && result.redirectUrl) {
                        toast.info("Redirecting to your bank for verification...");
                        window.location.href = result.redirectUrl;
                    } else if (result.status === 'paid') {
                        toast.success("Card payment successful — your wallet has been credited.");
                        setCardNumber(''); setCardExpiry(''); setCardCvv('');
                    } else {
                        setLencoReference(result.reference);
                        setLencoMessage("Your card payment is being processed. Tap below to check the status.");
                    }
                }
            } else if (paymentMethod === 'lenco') {
                // Lenco mobile-money collection: same ZMW-canonical rule.
                const zmwAmount = Math.round(toZmw(numAmount, currency) * 100) / 100;
                if (!(zmwAmount >= 1)) {
                    toast.error("Top-up must be at least K1.00");
                    setIsLoading(false);
                    return;
                }
                if (lencoPhone.replace(/\D/g, '').length < 9) {
                    toast.error("Enter the mobile-money phone number that will approve this payment");
                    setIsLoading(false);
                    return;
                }
                const res = await createCollection({
                    amount: zmwAmount,
                    currency: 'ZMW',
                    reference_type: 'wallet_topup',
                    reference_id: user.id,
                    description: `Wallet Top Up (${formatPrice(zmwAmount, 'ZMW')})`,
                    phone: lencoPhone,
                    operator: lencoOperator,
                    country: 'zm',
                });
                if (res?.reference) {
                    setLencoReference(res.reference);
                    setLencoMessage(res.message || 'Approve the payment on your phone, then tap "I\'ve approved".');
                    if (res.status === 'paid') {
                        toast.success("Payment confirmed — your wallet has been credited.");
                        setLencoReference(null);
                    }
                }
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
                    Add funds to your wallet using Mobile Money, Card, or PayPal
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-sm font-semibold text-muted-foreground">Select Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(value) => { setPaymentMethod(value as PaymentMethod); setLencoReference(null); }} className="grid grid-cols-3 gap-3">
                        <div className="flex items-center space-x-2 space-y-0">
                            <RadioGroupItem value="lenco" id="lenco" />
                            <Label htmlFor="lenco" className="font-normal cursor-pointer">Mobile Money</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-y-0">
                            <RadioGroupItem value="card" id="card" />
                            <Label htmlFor="card" className="font-normal cursor-pointer">Card</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-y-0">
                            <RadioGroupItem value="paypal" id="paypal" />
                            <Label htmlFor="paypal" className="font-normal cursor-pointer">PayPal</Label>
                        </div>
                    </RadioGroup>

                    {paymentMethod === 'card' && (
                        <div className="space-y-3 pt-1 rounded-xl border border-border p-4 bg-muted/30">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5 col-span-2">
                                    <Label htmlFor="card-name" className="text-xs text-muted-foreground">Name on card</Label>
                                    <Input id="card-name" placeholder="John Banda" className="h-11" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label htmlFor="card-email" className="text-xs text-muted-foreground">Email</Label>
                                    <Input id="card-email" type="email" placeholder="you@example.com" className="h-11" value={cardEmail} onChange={(e) => setCardEmail(e.target.value)} />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label htmlFor="card-number" className="text-xs text-muted-foreground">Card number</Label>
                                    <Input id="card-number" inputMode="numeric" placeholder="4111 1111 1111 1111" className="h-11" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} maxLength={23} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="card-expiry" className="text-xs text-muted-foreground">Expiry (MM/YY)</Label>
                                    <Input id="card-expiry" placeholder="12/28" className="h-11" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} maxLength={5} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="card-cvv" className="text-xs text-muted-foreground">CVV</Label>
                                    <Input id="card-cvv" inputMode="numeric" type="password" placeholder="123" className="h-11" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} maxLength={4} />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Card details are encrypted end-to-end and never stored.
                            </p>
                        </div>
                    )}

                    {paymentMethod === 'lenco' && !lencoReference && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1.5">
                                <Label htmlFor="lenco-operator" className="text-xs text-muted-foreground">Operator</Label>
                                <select
                                    id="lenco-operator"
                                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    value={lencoOperator}
                                    onChange={(e) => setLencoOperator(e.target.value as LencoOperator)}
                                >
                                    {LENCO_OPERATORS.map((op) => (
                                        <option key={op.value} value={op.value}>
                                            {op.label} ({op.hint})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lenco-phone" className="text-xs text-muted-foreground">MoMo phone number</Label>
                                <Input
                                    id="lenco-phone"
                                    type="tel"
                                    placeholder="0971234567"
                                    className="h-11"
                                    value={lencoPhone}
                                    onChange={(e) => setLencoPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'lenco' && lencoReference && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                            <p className="text-sm font-semibold text-foreground">Check your phone</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{lencoMessage}</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    className="flex-1"
                                    disabled={verifying}
                                    onClick={async () => {
                                        const r = await verifyPayment(lencoReference);
                                        if (!r) return;
                                        if (r.status === 'paid') {
                                            toast.success("Payment confirmed — your wallet has been credited.");
                                            setLencoReference(null);
                                        } else if (r.status === 'failed' || r.status === 'cancelled') {
                                            toast.error("This payment did not complete. You can try again.");
                                            setLencoReference(null);
                                        } else {
                                            toast.info(r.message || "Still waiting — approve the prompt on your phone, then check again.");
                                        }
                                    }}
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        "I've approved — check status"
                                    )}
                                </Button>
                                <Button variant="outline" onClick={() => setLencoReference(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
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
                        <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">
                            {getSymbol()}
                        </span>
                        <Input
                            id="amount"
                            type="number"
                            min="1"
                            placeholder="Enter custom amount"
                            aria-label={`Top-up amount in ${currency}`}
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
                        {paymentMethod === 'paypal'
                            ? 'Your payment is processed securely via PayPal. Funds will be available in your wallet immediately after successful payment.'
                            : paymentMethod === 'card'
                            ? 'Your card is charged securely through encrypted processing. Card details are never stored. Some cards may require bank verification (3D Secure).'
                            : 'Mobile money collects straight from your MTN, Airtel or Zamtel wallet. Approve the prompt on your phone; funds land in your Doc\u2019O Clock wallet as soon as the collection succeeds.'}
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
                            Pay with {paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'card' ? 'Card' : 'Mobile Money'}
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
