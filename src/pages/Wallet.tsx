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
        <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
            <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
                <div className="max-w-content mx-auto flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                        <WalletIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                            Healthcare Wallet
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-success-500 dark:bg-emerald-600">
                                <ShieldCheck className="h-3 w-3" /> ZMW · Live FX
                            </span>
                        </h1>
                        <p className="text-sm text-graphite-500 dark:text-slate-400 font-medium tracking-wide">
                            Balances, top-ups, and transaction history — display converts at live bank rates, settlement is always ZMW
                        </p>
                    </div>
                </div>
            </div>
            <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <CurrencySelector />
                    </div>
                    <div className="hidden sm:block" />
                </div>

                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                            <WalletIcon className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="vf-eyebrow mb-2">
                                <WalletIcon className="h-3.5 w-3.5 text-accent-500" />
                                Financial Suite
                            </div>
                            <h1 className="font-display text-3xl font-medium tracking-tight text-midnight">Healthcare Wallet</h1>
                            <p className="text-sm text-graphite-500 font-medium tracking-wide">
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
