
import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { useErrorHandler } from "@/hooks/use-error-handler";

// Type for our enhanced fetch function
type ApiQueryFunction<T> = () => Promise<T>;

export function useApiQuery<T>(
  queryKey: QueryKey,
  queryFn: ApiQueryFunction<T>,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'> & {
    errorMessage?: string;
    showErrorToast?: boolean;
  }
) {
  const { handleError } = useErrorHandler();
  const { errorMessage = "Failed to fetch data", showErrorToast = true, ...queryOptions } = options || {};

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (error) {
        // Format error for better debugging
        console.error(`API Query Error [${queryKey}]:`, error);
        
        // Show user-friendly error message
        if (showErrorToast) {
          toast.error(errorMessage);
        }
        
        // Use our centralized error handler
        handleError(error, errorMessage);
        
        // Re-throw to let React Query handle it
        throw error;
      }
    },
    // Default options for better performance
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Only retry network errors, not 4xx/5xx responses
      if (error instanceof Error && error.message.includes('Network')) {
        return failureCount < 3;
      }
      return false;
    },
    refetchOnWindowFocus: false, // Disable auto-refetch on window focus
    ...queryOptions
  });
}
