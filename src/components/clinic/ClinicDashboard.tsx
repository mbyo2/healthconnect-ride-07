import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProviderTeamCard } from "@/components/provider/ProviderTeamCard";
import { PromoCodeRedeem } from "@/components/subscription/PromoCodeRedeem";
import { useInstitutionSpecialties } from "@/hooks/useClinicSpecialties";
import { useUserSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, Users, Clock, TrendingUp, Star,
  Stethoscope, Building2, CreditCard
} from "lucide-react";

interface ClinicDashboardProps {
  institutionId: string;
}

export const ClinicDashboard = ({ institutionId }: ClinicDashboardProps) => {
  const { user } = useAuth();
  const { data: specialties } = useInstitutionSpecialties(institutionId);
  const { data: subscription } = useUserSubscription();

  // Quick stats
  const { data: stats } = useQuery({
    queryKey: ['clinic-stats', institutionId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [appointments, staff] = await Promise.all([
        (supabase as any).from('appointments')
          .select('id, status', { count: 'exact' })
          .eq('provider_id', user!.id)
          .eq('date', today),
        (supabase as any).from('institution_staff')
          .select('id', { count: 'exact' })
          .eq('institution_id', institutionId)
          .eq('is_active', true),
      ]);

      return {
        todayAppointments: appointments.count || 0,
        activeStaff: staff.count || 0,
        specialtyCount: specialties?.length || 0,
      };
    },
    enabled: !!user && !!institutionId,
  });

  const specialtyIds = specialties?.map(s => s.specialty_id) || [];
  const isTrial = subscription?.status === 'trialing';

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {isTrial && (
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">🎉 Free Trial Active</p>
              <p className="text-xs text-muted-foreground">
                Your trial ends on {subscription?.trial_end ? new Date(subscription.trial_end).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <Button size="sm" variant="outline">Upgrade Now</Button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats?.todayAppointments || 0}</p>
              <p className="text-xs text-muted-foreground">Today's Appointments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats?.activeStaff || 0}</p>
              <p className="text-xs text-muted-foreground">Active Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats?.specialtyCount || 0}</p>
              <p className="text-xs text-muted-foreground">Specialties</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">4.8</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specialties */}
      {specialties && specialties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Clinic Specialties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => (
                <Badge key={s.id} variant={s.is_primary ? "default" : "outline"} className="text-sm py-1 px-3">
                  {s.specialty?.name}
                  {s.is_primary && <span className="ml-1 text-xs opacity-70">• Primary</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="team">
          <ProviderTeamCard specialtyIds={specialtyIds} />
        </TabsContent>
        
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Manage your clinic's schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                View and manage appointments from the <Button variant="link" className="p-0 h-auto">Appointments</Button> page
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Subscription & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{subscription.plan?.name || 'Current Plan'}</p>
                      <p className="text-sm text-muted-foreground capitalize">{subscription.status} • {subscription.billing_cycle}</p>
                    </div>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {subscription.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active subscription. Start a free trial or choose a plan.</p>
              )}
              <PromoCodeRedeem context="subscription" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
