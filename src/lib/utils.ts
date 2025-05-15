
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useCallback } from "react"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Type-safe debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Optimized fetch wrapper with retry logic and offline support
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries = 2,
  retryDelay = 1000,
  suppressErrors = false
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cache-Control': options.method === 'GET' ? 'max-age=60' : 'no-cache',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (navigator.onLine === false) {
      if (!suppressErrors) {
        toast.error("You're offline. Please check your connection.");
      }
      throw new Error('Network connection lost');
    }
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchWithRetry(url, options, retries - 1, retryDelay * 1.5, suppressErrors);
    }
    
    if (!suppressErrors) {
      toast.error("Network request failed. Please try again later.");
    }
    throw error;
  }
}

/**
 * Create a cache key for react-query
 */
export function createQueryKey(base: string, params: Record<string, any> = {}): [string, Record<string, any>] {
  return [base, params];
}
