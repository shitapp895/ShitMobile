import { useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useLoading } from '../contexts/LoadingContext';
import { useError } from '../contexts/ErrorContext';

/**
 * API request options
 */
interface APIRequestOptions {
  /** Whether to show the global loading indicator */
  showGlobalLoading?: boolean;
  /** Whether to handle errors using the global error handler */
  handleGlobalError?: boolean;
  /** Whether to persist previous data on error */
  keepPreviousDataOnError?: boolean;
  /** Timeout in milliseconds for the request */
  timeout?: number;
  /** Whether to retry on network errors */
  retry?: boolean;
  /** Number of retry attempts */
  retryAttempts?: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;
}

/**
 * Custom API error with additional details
 */
export class APIError extends Error {
  status?: number;
  isNetworkError: boolean;
  isTimeoutError: boolean;

  constructor(message: string, options: { 
    status?: number; 
    isNetworkError?: boolean;
    isTimeoutError?: boolean;
  } = {}) {
    super(message);
    this.name = 'APIError';
    this.status = options.status;
    this.isNetworkError = options.isNetworkError || false;
    this.isTimeoutError = options.isTimeoutError || false;
  }
}

/**
 * Creates a promise that rejects after the specified timeout
 */
const createTimeoutPromise = (timeout: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new APIError('Request timed out', { isTimeoutError: true }));
    }, timeout);
  });
};

/**
 * Sleep function for implementing retry delay
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Hook for handling API requests with integrated loading and error handling
 */
export const useAPI = <T = any>() => {
  const { showLoading, hideLoading } = useLoading();
  const { handleError } = useError();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Execute an API call with automatic loading state and error handling
   * @param apiFunc The API function to call
   * @param loadingMessage Optional loading message to display
   * @param errorMessage Optional fallback error message
   * @param options Additional options for error handling
   * @returns The API response data
   */
  const executeRequest = useCallback(async <R extends T>(
    apiFunc: () => Promise<R>,
    loadingMessage?: string,
    errorMessage?: string,
    options?: APIRequestOptions
  ): Promise<R | null> => {
    const { 
      showGlobalLoading = true, 
      handleGlobalError = true,
      keepPreviousDataOnError = false,
      timeout = 30000,
      retry = true,
      retryAttempts = 2,
      retryDelay = 1000
    } = options || {};
    
    // Reset error state
    setError(null);
    
    let loadingId: number | undefined;
    
    try {
      setIsLoading(true);
      
      if (showGlobalLoading) {
        loadingId = showLoading(loadingMessage);
      }
      
      let attempts = 0;
      let lastError: any = null;
      
      while (attempts <= retryAttempts) {
        try {
          // Check network connection before making the request
          const networkState = await NetInfo.fetch();
          if (!networkState.isConnected || !networkState.isInternetReachable) {
            throw new APIError('No internet connection', { isNetworkError: true });
          }
          
          // Create a timeout promise that will reject if the request takes too long
          const timeoutPromise = createTimeoutPromise(timeout);
          
          // Race the API call against the timeout
          const result = await Promise.race([apiFunc(), timeoutPromise]);
          
          // Success - update state and return result
          setData(result);
          return result;
        } catch (err) {
          lastError = err;
          
          // Determine if this error is retriable
          const error = err instanceof Error ? err : new Error(String(err));
          const apiError = error instanceof APIError ? error : 
            new APIError(error.message, { 
              isNetworkError: error.message.includes('network') || error.message.includes('connection') 
            });
          
          // Only retry on network errors or timeout errors if retry is enabled
          if (retry && 
              (apiError.isNetworkError || apiError.isTimeoutError) && 
              attempts < retryAttempts) {
            attempts++;
            // Wait before retrying
            await sleep(retryDelay);
            continue;
          }
          
          // If we get here, we're not retrying
          throw apiError;
        }
      }
      
      // If we've exhausted all retry attempts, throw the last error
      throw lastError;
    } catch (err) {
      // Convert to APIError if needed
      const error = err instanceof APIError ? err : 
        err instanceof Error ? new APIError(err.message) : new APIError(String(err));
      
      // Set the error state
      setError(error);
      
      // If keepPreviousDataOnError is false, clear the data
      if (!keepPreviousDataOnError) {
        setData(null);
      }
      
      // Use global error handling if enabled
      if (handleGlobalError) {
        // Customize error message based on error type
        let message = errorMessage || 'An error occurred';
        
        if (error.isNetworkError) {
          message = 'Network connection error. Please check your internet connection.';
        } else if (error.isTimeoutError) {
          message = 'Request timed out. Please try again later.';
        } else if (error.status === 401) {
          message = 'Authentication error. Please log in again.';
        } else if (error.status === 403) {
          message = 'You don\'t have permission to access this resource.';
        } else if (error.status === 404) {
          message = 'The requested resource was not found.';
        } else if (error.status && error.status >= 500) {
          message = 'Server error. Please try again later.';
        }
        
        handleError(error, message);
      }
      
      console.error('API request failed:', error);
      return null;
    } finally {
      setIsLoading(false);
      
      if (showGlobalLoading && loadingId !== undefined) {
        hideLoading(loadingId);
      }
    }
  }, [showLoading, hideLoading, handleError]);

  /**
   * Reset the API state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    executeRequest,
    setData,
    reset,
  };
}; 