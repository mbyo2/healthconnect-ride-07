import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Post-visit review prompts (Zocdoc parity)
 * Prompts patients to review providers after completed appointments.
 */

interface PendingReview {
  appointment_id: string;
  provider_id: string;
  provider_name: string;
  appointment_date: string;
}

export function ReviewPromptCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selected, setSelected] = useState<PendingReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Find completed appointments without reviews
  const { data: pending } = useQuery({
    queryKey: ['pending-reviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get completed appointments in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, provider_id, appointment_date')
        .eq('patient_id', user.id)
        .eq('status', 'completed')
        .gte('appointment_date', thirtyDaysAgo.toISOString())
        .order('appointment_date', { ascending: false })
        .limit(10);
      
      if (error || !appointments) return [];
      
      // Check which ones already have reviews
      const appointmentIds = appointments.map((a: any) => a.id);
      const { data: reviews } = await supabase
        .from('provider_reviews')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);
      
      const reviewedIds = new Set((reviews || []).map((r: any) => r.appointment_id));
      const pendingAppts = appointments.filter((a: any) => !reviewedIds.has(a.id));
      
      if (pendingAppts.length === 0) return [];
      
      // Get provider names
      const providerIds = [...new Set(pendingAppts.map((a: any) => a.provider_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', providerIds);
      
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      
      return pendingAppts.map((a: any) => ({
        appointment_id: a.id,
        provider_id: a.provider_id,
        provider_name: profileMap[a.provider_id] 
          ? `${profileMap[a.provider_id].first_name} ${profileMap[a.provider_id].last_name}`
          : 'Your provider',
        appointment_date: a.appointment_date,
      })) as PendingReview[];
    },
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !user?.id) throw new Error("Missing data");
      if (rating === 0) throw new Error("Please select a rating");
      
      const { error } = await supabase
        .from('provider_reviews')
        .insert({
          patient_id: user.id,
          provider_id: selected.provider_id,
          appointment_id: selected.appointment_id,
          rating,
          comment: comment.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews', user?.id] });
      setShowDialog(false);
      setSelected(null);
      setRating(0);
      setComment("");
      toast.success("Thank you for your review!");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to submit review");
    },
  });

  const visiblePending = (pending || []).filter(p => !dismissed.includes(p.appointment_id));
  if (visiblePending.length === 0) return null;

  const current = visiblePending[0];

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm">How was your visit?</p>
              <p className="text-xs text-muted-foreground mt-1">
                with {current.provider_name} on {new Date(current.appointment_date).toLocaleDateString()}
              </p>
              {visiblePending.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  +{visiblePending.length - 1} more visits to review
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed([...dismissed, current.appointment_id])}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                setSelected(current);
                setShowDialog(true);
              }}
            >
              <Star className="h-3 w-3 mr-1" />
              Write a review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissed([...dismissed, current.appointment_id])}
            >
              Maybe later
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review your visit</DialogTitle>
            <DialogDescription>
              with {selected?.provider_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-2">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30 hover:text-muted-foreground/50"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Comment (optional)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={rating === 0 || submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit review"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
