import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface LoadingState {
  id: number;
  text: string | null;
}

interface LoadingContextType {
  isLoading: boolean;
  loadingText: string | null;
  showLoading: (text?: string) => number;
  hideLoading: (id?: number) => void;
  withLoading: <T>(promise: Promise<T>, text?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

/**
 * Loading provider for managing global loading states
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const loadingStates = useRef<Map<number, LoadingState>>(new Map());
  const idCounter = useRef<number>(0);

  // Helper function to update loading text based on most recent state
  const updateLoadingText = useCallback(() => {
    if (loadingStates.current.size === 0) {
      setLoadingText(null);
      return;
    }

    // Get the most recent loading state (highest ID)
    let highestId = -1;
    let text: string | null = null;
    
    loadingStates.current.forEach((state) => {
      if (state.id > highestId) {
        highestId = state.id;
        text = state.text;
      }
    });
    
    setLoadingText(text);
  }, []);

  /**
   * Show the loading indicator with optional text
   * @param text Optional loading text to display
   * @returns A unique ID for this loading state that can be used to hide it
   */
  const showLoading = useCallback((text?: string): number => {
    const id = idCounter.current += 1;
    
    // Store the loading state with its text
    loadingStates.current.set(id, { id, text: text || null });
    
    // Update visible state
    setIsLoading(true);
    updateLoadingText();
    
    return id;
  }, [updateLoadingText]);

  /**
   * Hide the loading indicator
   * @param id Optional ID of specific loading state to hide. If not provided, all loading states will be hidden.
   */
  const hideLoading = useCallback((id?: number): void => {
    if (id !== undefined) {
      // If an ID is provided, only hide that specific loading state
      loadingStates.current.delete(id);
    } else {
      // If no ID is provided, clear all loading states
      loadingStates.current.clear();
    }
    
    // Update loading state based on remaining loading states
    if (loadingStates.current.size === 0) {
      setIsLoading(false);
      setLoadingText(null);
    } else {
      updateLoadingText();
    }
  }, [updateLoadingText]);

  /**
   * Helper to wrap async operations with loading indicators
   */
  const withLoading = useCallback(async <T,>(
    promise: Promise<T>,
    text?: string
  ): Promise<T> => {
    const loadingId = showLoading(text);
    
    try {
      return await promise;
    } finally {
      hideLoading(loadingId);
    }
  }, [showLoading, hideLoading]);

  const value = {
    isLoading,
    loadingText,
    showLoading,
    hideLoading,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * Hook to use the loading context
 */
export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  
  return context;
};

export default LoadingContext; 