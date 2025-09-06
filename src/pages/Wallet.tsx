import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletCard } from "@/components/payment/WalletCard";
import { InstitutionWalletCard } from "@/components/payment/InstitutionWalletCard";
import { AppOwnerWalletCard } from "@/components/payment/AppOwnerWalletCard";
import { CommissionSettings } from "@/components/admin/CommissionSettings";
import { PaymentHistory } from "@/components/payment/PaymentHistory";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Wallet as WalletIcon, TrendingUp, Settings, History, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Wallet() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      // If user is health personnel, check if they're affiliated with an institution
      if (profile.role === 'health_personnel') {
        const { data: institutionStaff, error: staffError } = await supabase
          .from('institution_staff')
          .select(`
            *,
            healthcare_institutions (*)
          `)
          .eq('provider_id', user.id)
          .eq('is_active', true)
          .single();

        if (!staffError && institutionStaff) {
          setInstitutionData(institutionStaff.healthcare_institutions);
        }
      }

      // If user is admin of an institution, get their institution
      if (profile.role === 'health_personnel' || profile.role === 'admin') {
        const { data: institution, error: instError } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('admin_id', user.id)
          .single();

        if (!instError && institution) {
          setInstitutionData(institution);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userProfile?.admin_level === 'admin' || userProfile?.admin_level === 'superadmin';
  const isSuperAdmin = userProfile?.admin_level === 'superadmin';
  const isHealthPersonnel = userProfile?.role === 'health_personnel';
  const hasInstitution = institutionData !== null;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <WalletIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground">
            Manage your finances and view transaction history
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          {hasInstitution && (
            <TabsTrigger value="institution" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Institution
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Personal Wallet */}
            <WalletCard />

            {/* Institution Wallet (if applicable) */}
            {hasInstitution && (
              <InstitutionWalletCard institutionId={institutionData.id} />
            )}

            {/* App Owner Wallet (Super Admin only) */}
            {isSuperAdmin && (
              <AppOwnerWalletCard />
            )}
          </div>

          {/* Earnings Overview for Health Personnel */}
          {isHealthPersonnel && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle>Earnings Overview</CardTitle>
                </div>
                <CardDescription>
                  Your commission structure and earnings breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your Commission Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {hasInstitution ? '75%' : '90%'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasInstitution 
                        ? 'As affiliated provider' 
                        : 'As independent provider (includes institution share)'
                      }
                    </p>
                  </div>
                  {hasInstitution && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Institution Share</p>
                      <p className="text-2xl font-bold text-blue-600">15%</p>
                      <p className="text-xs text-muted-foreground">
                        Goes to {institutionData.name}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory userId={user?.id || ''} />
        </TabsContent>

        {hasInstitution && (
          <TabsContent value="institution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Institution: {institutionData.name}</CardTitle>
                <CardDescription>
                  Manage your institution's wallet and view financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InstitutionWalletCard institutionId={institutionData.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <div className="grid gap-6">
              <AppOwnerWalletCard />
              <CommissionSettings />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}