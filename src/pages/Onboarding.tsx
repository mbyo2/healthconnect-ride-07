import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { Sparkles, UserCheck } from "lucide-react";
import { useFlushPendingPatientProfile } from "@/hooks/useFlushPendingPatientProfile";

const Onboarding = () => {
  // Writes registration details (emergency contact, insurance, medical
  // history) that were stashed at signup while email confirmation was pending.
  useFlushPendingPatientProfile();
  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black mx-auto shadow-xs">
            <UserCheck className="h-6 w-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-primary-500 bg-primary-50 border border-primary-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Welcome to Doc' O Clock</span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Complete Your Profile Setup</h1>
            <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium mt-1">
              Tell us who you are so we can set up your dashboard, notifications, and emergency contacts.
            </p>
          </div>
        </div>

        <div className="border-t border-canvas-silk pt-6">
          <ProfileSetup />
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
