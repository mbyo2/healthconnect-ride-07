import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { Sparkles, UserCheck } from "lucide-react";

const Onboarding = () => {
  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black mx-auto shadow-xs">
            <UserCheck className="h-6 w-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-[#0073ea] bg-[#e5f0ff] border border-[#0073ea]/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Welcome to Doc' O Clock WorkOS</span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Complete Your Profile Setup</h1>
            <p className="text-xs text-[#676879] font-medium mt-1">
              Configure your clinical role, contact preferences, and emergency telemetry parameters.
            </p>
          </div>
        </div>

        <div className="border-t border-[#e6e9ef] pt-6">
          <ProfileSetup />
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
