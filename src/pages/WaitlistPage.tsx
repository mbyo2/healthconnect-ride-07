import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Loader2, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface WaitlistEntry {
  id: string;
  provider_id: string;
  urgency: string;
  status: string;
  preferred_date_start: string | null;
  preferred_date_end: string | null;
  notes: string | null;
  created_at: string;
  notified_at: string | null;
  expires_at: string | null;
}

const urgencyColor = (u: string) => {
  switch (u) {
    case "urgent": return "bg-red-500/10 text-red-700 dark:text-red-300";
    case "soon": return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default: return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
};

const statusBadge = (s: string) => {
  switch (s) {
    case "notified": return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Bell className="h-3 w-3 mr-1" />Slot Available</Badge>;
    case "waiting": return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Waiting</Badge>;
    case "cancelled": return <Badge variant="outline">Cancelled</Badge>;
    case "expired": return <Badge variant="outline">Expired</Badge>;
    default: return <Badge variant="outline">{s}</Badge>;
  }
};

const WaitlistPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["my-waitlist", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("appointment_waitlist")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as WaitlistEntry[];
    },
    enabled: !!user,
  });

  const cancelEntry = async (id: string) => {
    const { error } = await (supabase as any)
      .from("appointment_waitlist")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to cancel waitlist entry");
      return;
    }
    toast.success("Removed from waitlist");
    queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Waitlists</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Get notified when earlier slots open with providers you've waitlisted with.
              </p>
            </div>
            <Button onClick={() => navigate("/search")} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Find Providers
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-foreground">You're not on any waitlists yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Find a provider and join their waitlist to get earlier slots.
                </p>
                <Button onClick={() => navigate("/search")} className="mt-4">
                  Find Providers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          Provider waitlist
                          <Badge className={urgencyColor(entry.urgency)}>
                            {entry.urgency}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Joined {new Date(entry.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {statusBadge(entry.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(entry.preferred_date_start || entry.preferred_date_end) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Preferred: {entry.preferred_date_start || "any"} → {entry.preferred_date_end || "any"}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground italic">"{entry.notes}"</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/provider/${entry.provider_id}`)}
                      >
                        View Provider
                      </Button>
                      {entry.status === "waiting" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelEntry(entry.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Leave Waitlist
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default WaitlistPage;
