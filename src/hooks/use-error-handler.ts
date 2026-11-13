
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export const useErrorHandler = () => {
  const handleError = (error: unknown, fallbackMessage = "An error occurred") => {
    console.error("Error caught:", error);

    // NEVER toast raw error text: route through the friendly-error
    // sanitizer so the user only ever sees crafted, plain-language copy
    // (or the caller's fallback). Raw Supabase/PostgREST/JWT text is a
    // system response, not app copy (CEO rule, 2026-10-22). The raw
    // message/stack stay in the console + return value for debugging.
    const message = friendlyErrorMessage(error, fallbackMessage);

    let details = "";
    if (error instanceof Error) {
      details = error.stack || "";
    } else if (error && typeof error === "object" && "details" in error) {
      details = String((error as any).details);
    }

    // Show a user-friendly toast
    toast.error(message);

    // Return the message for potential further processing
    return {
      message,
      details
    };
  };

  return { handleError };
};
