import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, CheckCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProviderReviewsProps {
  providerId: string;
  showWriteReview?: boolean;
  appointmentId?: string;
}

export const ProviderReviews = ({ providerId, showWriteReview = false, appointmentId }: ProviderReviewsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [showForm, setShowForm] = useState(showWriteReview);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['provider-reviews', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_reviews' as any)
        .select(`
          *,
          patient:profiles!provider_reviews_patient_id_fkey (first_name, last_name, avatar_url)
        `)
        .eq('provider_id', providerId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['provider-stats', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_statistics' as any)
        .select('*')
        .eq('provider_id', providerId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as any;
    }
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (rating === 0) throw new Error('Please select a rating');

      const { error } = await supabase
        .from('provider_reviews' as any)
        .insert({
          provider_id: providerId,
          patient_id: user.id,
          appointment_id: appointmentId || null,
          rating,
          title: title || null,
          review_text: reviewText || null,
          is_verified: !!appointmentId
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['provider-reviews', providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider-stats', providerId] });
      setRating(0);
      setTitle('');
      setReviewText('');
      setShowForm(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit review')
  });

  const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: reviews.filter((rev: any) => rev.rating === r).length,
    percentage: reviews.length > 0 ? (reviews.filter((rev: any) => rev.rating === r).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold">{stats?.average_rating?.toFixed(1) || '0.0'}</div>
              <div className="flex justify-center mt-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-5 w-5 ${s <= (stats?.average_rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stats?.total_reviews || 0} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingDistribution.map(({ stars, count, percentage }) => (
                <div key={stars} className="flex items-center gap-2 text-sm">
                  <span className="w-8">{stars}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="w-8 text-muted-foreground text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
          {user && !showForm && (
            <Button className="mt-4" variant="outline" onClick={() => setShowForm(true)}>
              Write a Review
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Write Review Form */}
      {showForm && user && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
            <CardDescription>Share your experience with this provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Your Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(s)}
                    className="p-1"
                  >
                    <Star className={`h-8 w-8 transition-colors ${
                      s <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-muted'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="Review title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Tell others about your experience..." value={reviewText} onChange={e => setReviewText(e.target.value)} rows={4} />
            <div className="flex gap-2">
              <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending || rating === 0}>
                {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No reviews yet. Be the first to review!</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.patient?.avatar_url} />
                    <AvatarFallback>{review.patient?.first_name?.[0]}{review.patient?.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{review.patient?.first_name} {review.patient?.last_name?.[0]}.</span>
                      {review.is_verified && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle className="h-3 w-3" /> Verified Visit
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex mt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                      ))}
                    </div>
                    {review.title && <p className="font-medium mt-2">{review.title}</p>}
                    {review.review_text && <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>}
                    
                    {review.provider_response && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-1 text-xs font-medium mb-1">
                          <MessageSquare className="h-3 w-3" /> Provider Response
                        </div>
                        <p className="text-sm text-muted-foreground">{review.provider_response}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2">
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="h-3 w-3" /> Helpful ({review.helpful_count || 0})
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
