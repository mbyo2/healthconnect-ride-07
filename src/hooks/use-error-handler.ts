
import { toast } from "sonner";

export const useErrorHandler = () => {
  const handleError = (error: unknown, fallbackMessage = "An error occurred") => {
    console.error("Error caught:", error);
    
    let message = fallbackMessage;
    let details = "";
    
    if (error instanceof Error) {
      message = error.message;
      details = error.stack || "";
    } else if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object" && "message" in error) {
      message = String((error as any).message);
      if ("details" in error) {
        details = String((error as any).details);
      }
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
