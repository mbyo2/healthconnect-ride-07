import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// API Error types
export interface ApiError {
    message: string;
    code?: string;
    details?: any;
}

// Logging utility
const logError = (context: string, error: any) => {
    console.error(`[API Service Error - ${context}]`, {
        message: error.message || 'Unknown error',
        code: error.code,
        details: error,
        timestamp: new Date().toISOString()
    });
};

const logInfo = (context: string, message: string, data?: any) => {
    console.log(`[API Service - ${context}]`, {
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

// Generic API call wrapper with error handling
export async function apiCall<T>(
    operation: () => Promise<T>,
    context: string,
    showToast: boolean = true
): Promise<{ data: T | null; error: ApiError | null }> {
    try {
        logInfo(context, 'Starting API call');
        const data = await operation();
        logInfo(context, 'API call successful');
        return { data, error: null };
    } catch (error: any) {
        const apiError: ApiError = {
            message: error.message || 'An unexpected error occurred',
            code: error.code,
            details: error
        };

        logError(context, error);

        if (showToast) {
            toast.error(`${context}: ${apiError.message}`);
        }

        return { data: null, error: apiError };
    }
}

// Supabase query wrapper with error handling
export async function supabaseQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    context: string,
    showToast: boolean = true
): Promise<{ data: T | null; error: ApiError | null }> {
    try {
        logInfo(context, 'Executing Supabase query');
        const { data, error } = await queryFn();

        if (error) {
            const apiError: ApiError = {
                message: error.message || 'Database query failed',
                code: error.code,
                details: error
            };

            logError(context, error);

            if (showToast) {
                toast.error(`${context}: ${apiError.message}`);
            }

            return { data: null, error: apiError };
        }

        logInfo(context, 'Supabase query successful', { recordCount: Array.isArray(data) ? data.length : 1 });
        return { data, error: null };
    } catch (error: any) {
        const apiError: ApiError = {
            message: error.message || 'An unexpected error occurred',
            code: error.code,
            details: error
        };

        logError(context, error);

        if (showToast) {
            toast.error(`${context}: ${apiError.message}`);
        }

        return { data: null, error: apiError };
    }
}

// Retry logic for failed API calls
export async function retryApiCall<T>(
    operation: () => Promise<{ data: T | null; error: ApiError | null }>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<{ data: T | null; error: ApiError | null }> {
    let lastError: ApiError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await operation();

        if (result.data !== null) {
            return result;
        }

        lastError = result.error;

        if (attempt < maxRetries) {
            logInfo('Retry', `Attempt ${attempt} failed, retrying in ${delayMs}ms`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return { data: null, error: lastError };
}

// Network status check
export async function checkNetworkStatus(): Promise<boolean> {
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
}

// Batch operations with error handling
export async function batchOperation<T>(
    items: T[],
    operation: (item: T) => Promise<any>,
    batchSize: number = 10
): Promise<{ successful: number; failed: number; errors: ApiError[] }> {
    const results = {
        successful: 0,
        failed: 0,
        errors: [] as ApiError[]
    };

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const promises = batch.map(async (item) => {
            try {
                await operation(item);
                results.successful++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({
                    message: error.message || 'Batch operation failed',
                    code: error.code,
                    details: error
                });
            }
        });

        await Promise.all(promises);
    }

    logInfo('Batch Operation', `Completed: ${results.successful} successful, ${results.failed} failed`);
    return results;
}