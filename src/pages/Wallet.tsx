import { WalletCard } from "@/components/home/WalletCard";
import { WalletTopUp } from "@/components/wallet/WalletTopUp";
import { WalletHistory } from "@/components/wallet/WalletHistory";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

const Wallet = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Wallet</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Manage your funds and view transaction history</p>
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
    );
};

export default Wallet;
