import { toast } from "sonner";

export const useErrorHandler = () => {
  const handleError = (error: unknown, fallbackMessage = "An error occurred") => {
    console.error("Error caught:", error);
    
    let message = fallbackMessage;
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }
    
    toast.error(message);
    return message;
  };

  return { handleError };
};