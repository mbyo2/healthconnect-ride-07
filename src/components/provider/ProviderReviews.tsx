
import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProviderReviewsProps {
  providerId: string | undefined;
}

export const ProviderReviews: React.FC<ProviderReviewsProps> = ({ providerId }) => {
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (providerId) {
      fetchReviews();
    }
  }, [providerId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles(first_name, last_name, avatar_url)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading reviews...</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Patient Reviews ({reviews.length})</h2>

      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No reviews yet.</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  {review.reviewer?.avatar_url ? (
                    <img src={review.reviewer.avatar_url} alt={`${review.reviewer.first_name} ${review.reviewer.last_name}`} />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">
                    {review.reviewer?.first_name} {review.reviewer?.last_name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
