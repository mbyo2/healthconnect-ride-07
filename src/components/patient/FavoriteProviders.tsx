import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Favorite toggle button for provider profiles.
 * Zocdoc parity: patients can save favorite providers for quick rebooking.
 */
export function FavoriteProviderButton({ 
  providerId, 
  className 
}: { 
  providerId: string; 
  className?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFavorite } = useQuery({
    queryKey: ['favorite-provider', user?.id, providerId],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('favorite_providers')
        .select('id')
        .eq('patient_id', user.id)
        .eq('provider_id', providerId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_providers')
          .delete()
          .eq('patient_id', user.id)
          .eq('provider_id', providerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorite_providers')
          .insert({ patient_id: user.id, provider_id: providerId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-provider', user?.id, providerId] });
      queryClient.invalidateQueries({ queryKey: ['favorite-providers', user?.id] });
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    },
    onError: () => {
      toast.error("Failed to update favorites");
    },
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleMutation.mutate()}
      disabled={toggleMutation.isPending}
      className={cn("gap-2", className)}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart 
        className={cn(
          "h-4 w-4 transition-colors",
          isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )} 
      />
      {isFavorite ? "Saved" : "Save"}
    </Button>
  );
}

/**
 * List of patient's favorite providers.
 */
export function FavoriteProvidersList() {
  const { user } = useAuth();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorite-providers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('favorite_providers')
        .select(`
          id,
          created_at,
          provider_id,
          notes
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch provider profiles
      const providerIds = (data || []).map((f: any) => f.provider_id);
      if (providerIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', providerIds);
      
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      
      return (data || []).map((f: any) => ({
        ...f,
        provider: profileMap[f.provider_id] || null,
      }));
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading favorites...</div>;
  }

  if (!favorites || favorites.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No favorite providers yet.</p>
          <p className="text-xs mt-1">Save providers you like for quick rebooking.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {favorites.map((fav: any) => (
        <Card key={fav.id}>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {fav.provider?.first_name} {fav.provider?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Saved {new Date(fav.created_at).toLocaleDateString()}
              </p>
            </div>
            <FavoriteProviderButton providerId={fav.provider_id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
