
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
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet className="h-24 w-24" />
            </div>

            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                    <Wallet className="h-4 w-4" />
                    My Wallet Balance
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="text-3xl font-bold">
                            {isLoading ? (
                                <span className="animate-pulse opacity-50">---</span>
                            ) : (
                                `$${balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )}
                        </div>
                        <p className="text-xs text-blue-100 mt-1">Available for consultations & medicine</p>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Button
                            size="sm"
                            className="bg-white text-blue-600 hover:bg-blue-50 flex-1 font-bold"
                            onClick={handleTopUp}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Top Up
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-500/20 border-blue-400/30 text-white hover:bg-blue-500/40 flex-1"
                            onClick={() => toast.info("Transaction history coming soon!")}
                        >
                            <History className="h-4 w-4 mr-1" />
                            History
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
