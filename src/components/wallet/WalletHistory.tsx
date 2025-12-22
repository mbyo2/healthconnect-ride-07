
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownLeft, ArrowUpRight, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface Transaction {
    id: string;
    transaction_type: 'credit' | 'debit' | 'refund';
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
}

export const WalletHistory = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchTransactions = async () => {
            try {
                const { data, error } = await supabase
                    .from('wallet_transactions')
                    .select('*, user_wallets!inner(user_id)')
                    .eq('user_wallets.user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [user]);

    const filteredTransactions = transactions.filter(t =>
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        Transaction History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        Transaction History
                    </CardTitle>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search transactions..."
                            className="pl-9 bg-white/80 border-gray-200 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                    {filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Clock className="h-12 w-12 opacity-20 mb-4" />
                            <p>No transactions found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredTransactions.map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className="p-4 hover:bg-blue-50/50 transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl ${transaction.transaction_type === 'credit'
                                                ? 'bg-green-100 text-green-600'
                                                : transaction.transaction_type === 'debit'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {transaction.transaction_type === 'credit' ? (
                                                <ArrowDownLeft className="h-5 w-5" />
                                            ) : (
                                                <ArrowUpRight className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                {transaction.description || (transaction.transaction_type === 'credit' ? 'Top Up' : 'Payment')}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                {format(new Date(transaction.created_at), 'MMM d, yyyy • HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-lg ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {transaction.transaction_type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                            Balance: ${transaction.balance_after.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
