import { Loader2 } from "lucide-react";

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background to-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-lg font-medium text-primary/80">Loading...</p>
      </div>
    </div>
  );
};