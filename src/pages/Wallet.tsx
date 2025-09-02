import { WalletCard } from '@/components/payment/WalletCard';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Wallet() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
            <p className="text-gray-600 mt-2">
              Manage your healthcare payment wallet and view transaction history
            </p>
          </div>
          <WalletCard />
        </div>
      </main>
    </div>
  );
}
