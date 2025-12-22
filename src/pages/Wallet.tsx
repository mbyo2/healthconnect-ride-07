
import React from 'react';
import { WalletCard } from "@/components/home/WalletCard";
import { WalletTopUp } from "@/components/wallet/WalletTopUp";
import { WalletHistory } from "@/components/wallet/WalletHistory";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const Wallet = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Header />

            <main className="container max-w-4xl mx-auto p-4 pt-20 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
                    <p className="text-gray-500">Manage your funds and view transaction history</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <WalletCard />
                        <WalletTopUp />
                    </div>

                    <div className="md:h-full">
                        <WalletHistory />
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Wallet;
