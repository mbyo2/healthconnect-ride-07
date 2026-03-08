import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  promo_type: 'one_time' | 'new_users_only' | 'referral' | 'multi_use';
  target_audience: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  min_spend_amount: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  referrer_reward_amount: number | null;
  referrer_reward_type: string | null;
  created_by: string | null;
  created_at: string;
}

export const usePromoCodes = () => {
  return useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PromoCode[];
    },
  });
};

export const useCreatePromoCode = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (promo: Partial<PromoCode>) => {
      const { data, error } = await (supabase as any)
        .from('promo_codes')
        .insert({ ...promo, code: promo.code?.toUpperCase().trim(), created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Promo code created!');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useTogglePromoCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('promo_codes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Promo code updated');
    },
  });
};

export const useRedeemPromoCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, context }: { code: string; context?: string }) => {
      const { data, error } = await supabase.rpc('redeem_promo_code', {
        p_code: code,
        p_context: context || 'subscription',
      } as any);
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['user-subscription'] });
      toast.success(`Promo code applied! ${data.discount_type === 'percentage' ? data.discount_value + '% off' : 'Discount applied'}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
};
