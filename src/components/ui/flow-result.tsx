import { CheckCircle2, XCircle, Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FlowResultProps {
  status: "success" | "error" | "loading";
  title: string;
  description?: string;
  loadingLabel?: string;
  /** Primary action, e.g. "View My Appointments" */
  primaryLabel?: string;
  onPrimary?: () => void;
  /** Secondary action, e.g. "Back to Home" */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Error flows: show an explicit retry button */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Terminal success/failure states for multi-step flows (booking, payment,
 * checkout, forms) — the modern-app pattern from the references: a clear
 * verdict, what happens next, and always a way forward. Never a bare toast.
 */
export function FlowResult({
  status,
  title,
  description,
  loadingLabel = "Working on it…",
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onRetry,
  retryLabel = "Try Again",
  className,
}: FlowResultProps) {
  if (status === "loading") {
    return (
      <div
        className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}
        role="status"
        aria-label={loadingLabel}
      >
        <Loader2 className="h-12 w-12 text-primary-500 animate-spin" aria-hidden />
        <p className="mt-4 text-sm font-medium text-muted-foreground">{loadingLabel}</p>
      </div>
    );
  }

  const success = status === "success";

  return (
    <div className={cn("flex flex-col items-center text-center px-6 py-8", className)}>
      <div
        className={cn(
          "mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full",
          success
            ? "bg-success-500/10 animate-in zoom-in duration-300"
            : "bg-destructive/10"
        )}
      >
        {success ? (
          <CheckCircle2 className="h-10 w-10 text-success-500" aria-hidden />
        ) : (
          <XCircle className="h-10 w-10 text-destructive" aria-hidden />
        )}
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
        {status === "error" && onRetry && (
          <Button onClick={onRetry} className="w-full h-12 font-bold">
            <RotateCcw className="h-4 w-4 mr-2" aria-hidden />
            {retryLabel}
          </Button>
        )}
        {primaryLabel && onPrimary && (
          <Button
            onClick={onPrimary}
            variant={status === "error" && onRetry ? "outline" : "default"}
            className="w-full h-12 font-bold"
          >
            {primaryLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button onClick={onSecondary} variant="ghost" className="w-full h-12">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function FlowResultCard(props: FlowResultProps & { wide?: boolean }) {
  const { wide, className, ...rest } = props;
  return (
    <Card className={cn("w-full", wide ? "max-w-lg" : "max-w-md", "mx-auto shadow-card", className)}>
      <FlowResult {...rest} />
    </Card>
  );
}
