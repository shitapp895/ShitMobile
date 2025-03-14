import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../theme';
import Typography from '../Typography/Typography';
import Button from '../Button/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the app
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    this.setState({
      errorInfo,
    });

    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Typography variant="h4" align="center" style={styles.title}>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" style={styles.message}>
              The app encountered an unexpected error. We apologize for the inconvenience.
            </Typography>
            
            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Typography variant="caption" style={styles.errorText}>
                  {this.state.error.toString()}
                </Typography>
                
                {this.state.errorInfo && (
                  <Typography variant="caption" style={styles.errorText}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </ScrollView>
            )}
            
            <Button 
              title="Try Again" 
              onPress={this.resetError} 
              style={styles.button}
            />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    shadowColor: theme.colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    marginBottom: theme.spacing.md,
    color: theme.colors.ui.error,
  },
  message: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.ui.error,
  },
  button: {
    minWidth: 120,
  },
});

export default ErrorBoundary; 