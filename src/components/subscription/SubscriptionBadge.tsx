import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useSubscription';

export const SubscriptionBadge = () => {
  const { data: subscription, isLoading } = useUserSubscription();

  if (isLoading || !subscription || subscription.plan?.price_monthly === 0) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      {subscription.plan?.slug?.includes('enterprise') || subscription.plan?.slug?.includes('family') ? (
        <Crown className="h-3 w-3 text-amber-500" />
      ) : (
        <Sparkles className="h-3 w-3 text-primary" />
      )}
      {subscription.plan?.name?.replace(/^(Provider |Patient |Institution )/, '')}
    </Badge>
  );
};
