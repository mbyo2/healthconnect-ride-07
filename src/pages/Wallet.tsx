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
        <div className="min-h-screen bg-canvas py-8 px-4 sm:px-6 font-sans">
            <div className="max-w-content mx-auto space-y-6">
                {/* Header Banner */}
                <div className="vf-card !p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
