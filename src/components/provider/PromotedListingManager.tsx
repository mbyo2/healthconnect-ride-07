import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Megaphone, TrendingUp, Eye, MousePointer, CalendarCheck, DollarSign, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PromotedListing {
  id: string;
  provider_id: string;
  plan_type: string;
  budget_daily: number;
  spent_total: number;
  impressions: number;
  clicks: number;
  bookings_from_ad: number;
  is_active: boolean;
}

export const PromotedListingManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [planType, setPlanType] = useState('basic');
  const [dailyBudget, setDailyBudget] = useState('10');

  const { data: listing } = useQuery({
    queryKey: ['promoted-listing', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('promoted_listings')
        .select('*')
        .eq('provider_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as PromotedListing | null;
    },
    enabled: !!user,
  });

  const createListing = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('promoted_listings').insert({
        provider_id: user!.id,
        plan_type: planType,
        budget_daily: parseFloat(dailyBudget),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promoted listing activated!');
      queryClient.invalidateQueries({ queryKey: ['promoted-listing'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      if (!listing) return;
      const { error } = await (supabase as any)
        .from('promoted_listings')
        .update({ is_active: !listing.is_active, updated_at: new Date().toISOString() })
        .eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoted-listing'] });
      toast.success(listing?.is_active ? 'Listing paused' : 'Listing reactivated');
    },
  });

  const PLANS = [
    { value: 'basic', label: 'Basic', price: '$10/day', features: ['Appear in search results', 'Basic analytics'] },
    { value: 'premium', label: 'Premium', price: '$25/day', features: ['Top of search results', 'Priority badge', 'Advanced analytics'] },
    { value: 'featured', label: 'Featured', price: '$50/day', features: ['Homepage spotlight', 'Featured badge', 'Priority booking', 'Full analytics suite'] },
  ];

  if (listing) {
    const ctr = listing.impressions > 0 ? ((listing.clicks / listing.impressions) * 100).toFixed(1) : '0';
    const convRate = listing.clicks > 0 ? ((listing.bookings_from_ad / listing.clicks) * 100).toFixed(1) : '0';

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Your Promoted Listing
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch checked={listing.is_active} onCheckedChange={() => toggleActive.mutate()} />
              <Badge variant={listing.is_active ? 'default' : 'secondary'}>
                {listing.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <Eye className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{listing.impressions?.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <MousePointer className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{listing.clicks?.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Clicks ({ctr}% CTR)</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <CalendarCheck className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{listing.bookings_from_ad}</p>
              <p className="text-xs text-muted-foreground">Bookings ({convRate}%)</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">${listing.spent_total?.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 p-3 bg-primary/5 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium capitalize">{listing.plan_type} Plan</p>
              <p className="text-xs text-muted-foreground">Daily budget: ${listing.budget_daily}/day</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Promote Your Practice
        </CardTitle>
        <CardDescription>Reach more patients and grow your practice with promoted listings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <button
              key={plan.value}
              onClick={() => setPlanType(plan.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                planType === plan.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">{plan.label}</h4>
                <Badge variant={planType === plan.value ? 'default' : 'secondary'}>{plan.price}</Badge>
              </div>
              <ul className="space-y-1">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <div>
          <Label>Daily Budget ($)</Label>
          <Input type="number" min="5" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="mt-1 max-w-[200px]" />
        </div>
        <Button onClick={() => createListing.mutate()} disabled={createListing.isPending} className="w-full" size="lg">
          {createListing.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
          Activate Promoted Listing
        </Button>
      </CardContent>
    </Card>
  );
};
