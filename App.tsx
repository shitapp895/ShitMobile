import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/contexts/AuthContext';
import { ErrorProvider } from './src/contexts/ErrorContext';
import { LoadingProvider } from './src/contexts/LoadingContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import Navigation from './src/navigation';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import ErrorHandler from './src/components/common/ErrorHandler';
import LoadingOverlay from './src/components/common/LoadingOverlay';
import NetworkStatus from './src/components/common/NetworkStatus/NetworkStatus';

/**
 * Main App component
 * Sets up providers, error handling, loading state, and navigation
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ErrorBoundary>
        <ThemeProvider>
          <ErrorProvider>
            <LoadingProvider>
              <AuthProvider>
                <Navigation />
                <ErrorHandler />
                <LoadingOverlay />
                <NetworkStatus />
              </AuthProvider>
            </LoadingProvider>
          </ErrorProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
