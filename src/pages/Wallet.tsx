import { WalletCard } from "@/components/home/WalletCard";
import { WalletTopUp } from "@/components/wallet/WalletTopUp";
import { WalletHistory } from "@/components/wallet/WalletHistory";
import { CurrencySelector } from "@/components/wallet/CurrencySelector";
import { EarningsPanel } from "@/components/wallet/EarningsPanel";
import { InstitutionWalletPanel } from "@/components/wallet/InstitutionWalletPanel";
import { PlatformWalletPanel } from "@/components/wallet/PlatformWalletPanel";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Wallet as WalletIcon, ShieldCheck } from "lucide-react";

const Wallet = () => {
    const { user, isLoading } = useAuth();
    const { isHealthPersonnel, isAdmin } = useUserRoles();
    const { institution, institutionId } = useInstitutionContext();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
            <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
                <div className="max-w-content mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                            <WalletIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                                {isHealthPersonnel && !isAdmin ? "Earnings & Wallet" : "Healthcare Wallet"}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-success-500 dark:bg-emerald-600">
                                    <ShieldCheck className="h-3 w-3" /> ZMW · Live FX
                                </span>
                            </h1>
                            <p className="text-sm text-graphite-500 dark:text-slate-400 font-medium tracking-wide">
                                {isHealthPersonnel && !isAdmin
                                    ? "Your earnings, top-ups, and transaction history — settlement is always ZMW"
                                    : "Balances, top-ups, and transaction history — display converts at live bank rates, settlement is always ZMW"}
                            </p>
                        </div>
                    </div>
                    <div className="w-full sm:w-56">
                        <CurrencySelector />
                    </div>
                </div>
            </div>
            <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
                {isAdmin && <PlatformWalletPanel />}

                {institutionId && (
                    <InstitutionWalletPanel
                        institutionId={institutionId}
                        institutionName={(institution as any)?.name}
                    />
                )}

                {isHealthPersonnel && !isAdmin && <EarningsPanel />}

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
