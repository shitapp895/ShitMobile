import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ErrorState {
  visible: boolean;
  message: string;
  type: 'inline' | 'banner' | 'toast';
  retryAction?: () => void;
}

interface ErrorContextType {
  error: ErrorState | null;
  showError: (message: string, type?: ErrorState['type'], retryAction?: () => void) => void;
  hideError: () => void;
  handleError: (error: Error, fallbackMessage?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * Error provider component for global error handling
 */
export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<ErrorState | null>(null);

  const showError = useCallback((
    message: string,
    type: ErrorState['type'] = 'toast',
    retryAction?: () => void
  ) => {
    setError({
      visible: true,
      message,
      type,
      retryAction,
    });
  }, []);

  const hideError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((
    error: Error,
    fallbackMessage: string = 'An unexpected error occurred. Please try again later.'
  ) => {
    console.error('Error handled by ErrorContext:', error);
    
    // Extract a user-friendly message or use the fallback
    const message = error.message || fallbackMessage;
    
    showError(message, 'toast');
    
    // You could add error logging to a service here
    // errorLoggingService.logError(error);
  }, [showError]);

  const value = {
    error,
    showError,
    hideError,
    handleError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

/**
 * Hook to use the error context
 */
export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  
  return context;
};

export default ErrorContext; 