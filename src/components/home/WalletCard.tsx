import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Plus, ArrowUpRight, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export const WalletCard = () => {
    const { user } = useAuth();
    const { isHealthPersonnel, isAdmin } = useUserRoles();
    const navigate = useNavigate();
    const location = useLocation();
    // Providers earn into this wallet; patients spend from it. Same balance,
    // different headline job.
    const isEarner = (isHealthPersonnel || isAdmin) && !!user;
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (!user) return;

        const fetchBalance = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_wallets')
                    .select('balance')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setBalance(Number(data.balance));
                } else {
                    // If no wallet exists, it might be a new user or the trigger hasn't run
                    // We'll show 0.00 for now
                    setBalance(0);
                }
            } catch (error) {
                console.error('Error fetching wallet balance:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBalance();

        // Subscribe to changes
        const channel = supabase
            .channel('wallet_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_wallets',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.new && 'balance' in payload.new) {
                        setBalance(Number(payload.new.balance));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleWalletAction = () => {
        navigate('/wallet');
    };

    // Jump to a wallet-page section. If we're already on /wallet, scroll
    // directly; otherwise navigate first, then scroll once it mounts.
    const scrollToWalletSection = (sectionId: string) => {
        const scroll = () =>
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (location.pathname === '/wallet') {
            scroll();
        } else {
            navigate('/wallet');
            window.setTimeout(scroll, 400);
        }
    };

    return (
        // PayPal anatomy (fidelity rebuild 2026-11-11): the wallet
        // summary is a WHITE HAIRLINE module with blue pill actions —
        // the solid blue band is retired.
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                    <Wallet className="h-3.5 w-3.5" aria-hidden />
                    {isEarner ? "Earnings Balance" : "Wallet balance"}
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-5">
                    <div>
                        <div className="text-4xl font-bold tracking-tight text-foreground">
                            {isLoading ? (
                                <Skeleton className="h-10 w-32 rounded-lg" />
                            ) : (
                                formatPrice(balance ?? 0)
                            )}
                        </div>
                        <p className="text-xs md:text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            {isEarner
                                ? "Consultation earnings & payouts"
                                : "Available for consultations & medicine"}
                        </p>
                    </div>

                    <div className="flex gap-3 mt-1">
                        <Button
                            size="sm"
                            className="flex-1 font-bold h-11"
                            onClick={() => scrollToWalletSection('wallet-topup')}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            {isEarner ? "Earnings" : "Top Up"}
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 font-semibold h-11"
                            onClick={() => scrollToWalletSection('wallet-history')}
                        >
                            <History className="h-4 w-4 mr-1.5" />
                            History
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
