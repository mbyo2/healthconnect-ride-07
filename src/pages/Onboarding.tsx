import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { Sparkles, UserCheck } from "lucide-react";
import { useFlushPendingPatientProfile } from "@/hooks/useFlushPendingPatientProfile";

const Onboarding = () => {
  // Writes registration details (emergency contact, insurance, medical
  // history) that were stashed at signup while email confirmation was pending.
  useFlushPendingPatientProfile();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans text-foreground">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-semibold mx-auto">
            <UserCheck className="h-6 w-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary-500 bg-primary-50 border border-primary-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Welcome to Doc' O Clock</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Complete Your Profile Setup</h1>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Tell us who you are so we can set up your dashboard, notifications, and emergency contacts.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <ProfileSetup />
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
