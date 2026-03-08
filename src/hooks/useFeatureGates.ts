import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface FeatureGate {
  feature_key: string;
  description: string | null;
  free_limit: number;
  requires_plan_type: string[] | null;
}

export const useFeatureGates = () => {
  return useQuery({
    queryKey: ['feature-gates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('feature_gates')
        .select('*');
      if (error) throw error;
      return data as FeatureGate[];
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const useFeatureAccess = () => {
  const { user } = useAuth();
  const { data: gates } = useFeatureGates();
  
  // Get user's current subscription from cache
  const checkAccess = (featureKey: string, currentPlanType?: string): { allowed: boolean; limit: number; reason?: string } => {
    if (!gates) return { allowed: true, limit: 999 };
    
    const gate = gates.find(g => g.feature_key === featureKey);
    if (!gate) return { allowed: true, limit: 999 }; // ungated feature
    
    // No subscription = free tier
    if (!currentPlanType || currentPlanType === 'free') {
      if (gate.free_limit > 0) {
        return { allowed: true, limit: gate.free_limit };
      }
      return { allowed: false, limit: 0, reason: 'Upgrade to a paid plan to access this feature' };
    }
    
    // Check if plan type is in allowed list
    if (gate.requires_plan_type && !gate.requires_plan_type.includes(currentPlanType)) {
      return { allowed: false, limit: 0, reason: 'Your current plan does not include this feature' };
    }
    
    return { allowed: true, limit: 999 };
  };

  return { checkAccess, gates };
};
