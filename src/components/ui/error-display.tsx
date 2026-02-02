import { AlertCircle, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "inline" | "card" | "fullPage";
  className?: string;
  isOffline?: boolean;
}

export function ErrorDisplay({
  title = "Something went wrong",
  message = "We couldn't complete your request. Please try again.",
  onRetry,
  variant = "card",
  className,
  isOffline = false
}: ErrorDisplayProps) {
  const Icon = isOffline ? WifiOff : AlertCircle;
  
  const content = (
    <div className={cn(
      "flex flex-col items-center text-center",
      variant === "fullPage" ? "py-12" : "py-6",
      className
    )}>
      <div className={cn(
        "rounded-full bg-destructive/10 flex items-center justify-center mb-4",
        variant === "fullPage" ? "w-16 h-16" : "w-12 h-12"
      )}>
        <Icon className={cn(
          "text-destructive",
          variant === "fullPage" ? "w-8 h-8" : "w-6 h-6"
        )} />
      </div>
      <h3 className={cn(
        "font-semibold text-foreground mb-1",
        variant === "fullPage" ? "text-xl" : "text-lg"
      )}>
        {isOffline ? "You're offline" : title}
      </h3>
      <p className={cn(
        "text-muted-foreground max-w-sm",
        variant === "fullPage" ? "text-base mb-6" : "text-sm mb-4"
      )}>
        {isOffline 
          ? "Check your internet connection and try again." 
          : message
        }
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );

  if (variant === "inline") {
    return content;
  }

  if (variant === "fullPage") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      {content}
    </Card>
  );
}
