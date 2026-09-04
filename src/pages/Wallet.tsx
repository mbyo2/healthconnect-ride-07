import { WalletCard } from "@/components/home/WalletCard";
import { WalletTopUp } from "@/components/wallet/WalletTopUp";
import { WalletHistory } from "@/components/wallet/WalletHistory";
import { CurrencySelector } from "@/components/wallet/CurrencySelector";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Wallet as WalletIcon, ShieldCheck } from "lucide-react";

const Wallet = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 py-8 px-4 sm:px-6 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header Banner */}
                <div className="rounded-3xl bg-[#0f172a] text-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black shadow-md">
                            <WalletIcon className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Financial Suite</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Healthcare Wallet</h1>
                            <p className="text-xs text-slate-400 font-medium">
                                Manage medical balances, consultation escrow &amp; digital payment methods
                            </p>
                        </div>
                    </div>
                    <div className="w-full sm:w-56">
                        <CurrencySelector />
                    </div>
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
            </div>
        </div>
    );
};

export default Wallet;
