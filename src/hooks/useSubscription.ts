import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  target_audience: 'provider' | 'patient' | 'institution';
  price_monthly: number;
  price_annual: number;
  currency: string;
  features: string[];
  limits: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  highlight: boolean;
  plan_type: 'free' | 'pay_per_booking' | 'subscription';
  booking_fee: number;
  max_beds?: number;
  max_users?: number;
  max_doctors?: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
  billing_cycle: 'monthly' | 'annual';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan?: SubscriptionPlan;
}

export interface BookingFee {
  id: string;
  provider_id: string;
  patient_id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: string;
  charged_at: string | null;
  created_at: string;
}

export const useSubscriptionPlans = (audience?: string) => {
  return useQuery({
    queryKey: ['subscription-plans', audience],
    queryFn: async () => {
      let query = (supabase as any)
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (audience) {
        query = query.eq('target_audience', audience);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
};

export const useUserSubscription = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('user_id', user!.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as (UserSubscription & { plan: SubscriptionPlan }) | null;
    },
    enabled: !!user,
  });
};

export const useProviderBookingFees = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['booking-fees', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('booking_fees')
        .select('*')
        .eq('provider_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BookingFee[];
    },
    enabled: !!user,
  });
};

export const useSubscribeToPlan = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, billingCycle, promoCodeId, trialDays }: { planId: string; billingCycle: 'monthly' | 'annual'; promoCodeId?: string; trialDays?: number }) => {
      const now = new Date();
      const effectiveTrialDays = trialDays || 0;
      
      // If trial, period starts after trial
      const trialEnd = effectiveTrialDays > 0 ? new Date(now.getTime() + effectiveTrialDays * 86400000) : null;
      const periodStart = trialEnd || now;
      const periodEnd = new Date(periodStart);
      if (billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Cancel existing active subscriptions
      await (supabase as any)
        .from('user_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .in('status', ['active', 'trialing']);

      const { data, error } = await (supabase as any)
        .from('user_subscriptions')
        .insert({
          user_id: user!.id,
          plan_id: planId,
          billing_cycle: billingCycle,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          status: effectiveTrialDays > 0 ? 'trialing' : 'active',
          trial_start: effectiveTrialDays > 0 ? now.toISOString() : null,
          trial_end: trialEnd?.toISOString() || null,
          promo_code_id: promoCodeId || null,
        })
        .select('*, plan:subscription_plans(*)')
        .single();

      if (error) throw error;

      // Log revenue event (skip for trials)
      if (effectiveTrialDays === 0) {
        const plan = data.plan;
        const amount = billingCycle === 'monthly' ? plan.price_monthly : plan.price_annual;
        if (amount > 0) {
          await (supabase as any).from('revenue_events').insert({
            user_id: user!.id,
            event_type: 'subscription_started',
            amount,
            currency: plan.currency,
            source: `subscription_${plan.slug}`,
            plan_id: planId,
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      const isTrial = data.status === 'trialing';
      toast.success(isTrial ? 'Free trial activated! Enjoy your 30-day trial.' : 'Subscription activated successfully!');
    },
    onError: (error: any) => {
      toast.error('Failed to subscribe: ' + error.message);
    },
  });
};

// Start a free 30-day trial for providers
export const useStartFreeTrial = () => {
  const subscribeToPlan = useSubscribeToPlan();
  
  return useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      return subscribeToPlan.mutateAsync({ planId, billingCycle: 'monthly', trialDays: 30 });
    },
  });
};

export const useCancelSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await (supabase as any)
        .from('user_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', subscriptionId)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      toast.success('Subscription will cancel at end of billing period');
    },
  });
};
