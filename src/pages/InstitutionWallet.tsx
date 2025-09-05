import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Users, TrendingUp, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { InstitutionWalletCard } from "@/components/payment/InstitutionWalletCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
}

export default function InstitutionWallet() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error("Please log in to access this page");
      navigate("/auth");
      return;
    }

    fetchInstitutionData();
  }, [user, navigate]);

  const fetchInstitutionData = async () => {
    try {
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select('id, name, type')
        .eq('admin_id', user?.id)
        .single();

      if (error) {
        throw error;
      }

      setInstitution(data);
    } catch (error) {
      console.error('Error fetching institution:', error);
      toast.error('Failed to load institution data');
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this institution's wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{institution.name} - Wallet</h1>
              <p className="text-muted-foreground">
                Manage your institution's financial operations
              </p>
            </div>
          </div>
          
          <Badge variant="secondary" className="ml-auto">
            {institution.type}
          </Badge>
        </div>

        <Tabs defaultValue="wallet" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-6">
            <InstitutionWalletCard institutionId={institution.id} />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No recent activity to display
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>Track your institution's commission earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">$0.00</div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">$0.00</div>
                    <p className="text-sm text-muted-foreground">Last Month</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">$0.00</div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>Download and export financial data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <Download className="h-5 w-5 mb-2" />
                    <span className="font-medium">Monthly Statement</span>
                    <span className="text-xs text-muted-foreground">Download PDF</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <TrendingUp className="h-5 w-5 mb-2" />
                    <span className="font-medium">Earnings Report</span>
                    <span className="text-xs text-muted-foreground">Export CSV</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <Users className="h-5 w-5 mb-2" />
                    <span className="font-medium">Staff Earnings</span>
                    <span className="text-xs text-muted-foreground">View Details</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <Building2 className="h-5 w-5 mb-2" />
                    <span className="font-medium">Tax Documents</span>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}