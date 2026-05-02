import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Building2, UserCheck, LogIn } from "lucide-react";
import { toast } from "sonner";

interface InvitationDetails {
  id: string;
  email: string;
  staff_role: string;
  department_name: string | null;
  specialty: string | null;
  status: string;
  expires_at: string;
  institution_id: string;
}

const AcceptInvitation = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error: invErr } = await (supabase as any)
        .from("staff_invitations")
        .select("id, email, staff_role, department_name, specialty, status, expires_at, institution_id")
        .eq("token", token)
        .maybeSingle();

      if (invErr || !data) {
        setError("Invitation not found or has been removed.");
        setLoading(false);
        return;
      }
      setInvitation(data);

      const { data: inst } = await supabase
        .from("healthcare_institutions")
        .select("name")
        .eq("id", data.institution_id)
        .maybeSingle();
      if (inst?.name) setInstitutionName(inst.name);
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}&email=${encodeURIComponent(invitation?.email || "")}`);
      return;
    }
    setAccepting(true);
    const { data, error: rpcError } = await (supabase as any).rpc("accept_staff_invitation", { _token: token });
    setAccepting(false);

    if (rpcError) {
      toast.error("Failed to accept invitation");
      setError(rpcError.message);
      return;
    }
    if (!data?.success) {
      setError(data?.error || "Could not accept invitation");
      toast.error(data?.error || "Could not accept invitation");
      return;
    }
    setAccepted(true);
    toast.success("Welcome to the team!");
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-emerald-500/30">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
            <CardTitle>You're in!</CardTitle>
            <CardDescription>
              You've successfully joined {institutionName}. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = invitation && new Date(invitation.expires_at) < new Date();
  const isPending = invitation?.status === "pending";
  const emailMismatch = user && invitation && user.email?.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 p-3 bg-primary/10 rounded-full w-fit">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>You're invited!</CardTitle>
          <CardDescription>
            {institutionName || "An institution"} invited you to join as{" "}
            <span className="font-semibold text-foreground capitalize">
              {invitation?.staff_role.replace(/_/g, " ")}
            </span>
            {invitation?.department_name && <> in {invitation.department_name}</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            {invitation?.specialty && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Specialty</span>
                <span className="font-medium">{invitation.specialty}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">{new Date(invitation!.expires_at).toLocaleDateString()}</span>
            </div>
          </div>

          {!isPending && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Already {invitation?.status}</AlertTitle>
              <AlertDescription>This invitation can no longer be used.</AlertDescription>
            </Alert>
          )}

          {isExpired && isPending && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Expired</AlertTitle>
              <AlertDescription>Ask your administrator to re-send the invitation.</AlertDescription>
            </Alert>
          )}

          {emailMismatch && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Wrong account</AlertTitle>
              <AlertDescription>
                You're signed in as {user?.email}. Please sign in as {invitation?.email}.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isPending && !isExpired && !emailMismatch && (
            <>
              {user ? (
                <Button onClick={handleAccept} disabled={accepting} className="w-full" size="lg">
                  {accepting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Joining...</>
                  ) : (
                    <><UserCheck className="h-4 w-4 mr-2" />Accept & Join</>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg">
                    <Link to={`/register?email=${encodeURIComponent(invitation!.email)}&invite=${token}`}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Create account & join
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/auth?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}>
                      <LogIn className="h-4 w-4 mr-2" />
                      I already have an account
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {emailMismatch && (
            <Button
              onClick={async () => { await supabase.auth.signOut(); navigate(`/auth?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`); }}
              variant="outline"
              className="w-full"
            >
              Sign out & switch account
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
