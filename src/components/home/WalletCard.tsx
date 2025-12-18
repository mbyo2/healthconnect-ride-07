
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowUpRight, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const WalletCard = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    const handleTopUp = () => {
        toast.info("Top up functionality coming soon!");
    };

    return (
        <Card className="group bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white border-none shadow-2xl overflow-hidden relative transition-all duration-500 hover:shadow-blue-500/20 hover:-translate-y-1 active:scale-[0.98]">
            {/* Animated background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-700" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />

            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform">
                <Wallet className="h-24 w-24" />
            </div>

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xs font-bold flex items-center gap-2 opacity-80 uppercase tracking-widest">
                    <Wallet className="h-3.5 w-3.5" />
                    My Wallet Balance
                </CardTitle>
            </CardHeader>

            <CardContent className="relative z-10">
                <div className="flex flex-col gap-5">
                    <div>
                        <div className="text-4xl font-black tracking-tight">
                            {isLoading ? (
                                <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                </div>
                            ) : (
                                `$${balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )}
                        </div>
                        <p className="text-[10px] md:text-xs text-blue-100/80 mt-1.5 font-medium flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Available for consultations & medicine
                        </p>
                    </div>

                    <div className="flex gap-3 mt-1">
                        <Button
                            size="sm"
                            className="bg-white text-blue-600 hover:bg-blue-50 flex-1 font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            onClick={handleTopUp}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Top Up
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 flex-1 font-semibold transition-all active:scale-95"
                            onClick={() => toast.info("Transaction history coming soon!")}
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
