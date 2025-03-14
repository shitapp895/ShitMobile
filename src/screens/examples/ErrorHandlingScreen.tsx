import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useAPI, APIError } from '../../hooks/useAPI';
import { useError } from '../../contexts/ErrorContext';
import { Button, Card, Typography } from '../../components/common';
import { theme } from '../../theme';

/**
 * Screen that demonstrates the app's error handling capabilities
 */
const ErrorHandlingScreen: React.FC = () => {
  const { executeRequest } = useAPI<string>();
  const { showError } = useError();

  // Simulate a network error
  const handleNetworkError = useCallback(async () => {
    await executeRequest(
      () => Promise.reject(new APIError('Network error', { isNetworkError: true })),
      'Simulating network error...',
      'Failed to connect to server'
    );
  }, [executeRequest]);

  // Simulate a timeout error
  const handleTimeoutError = useCallback(async () => {
    await executeRequest<string>(
      () => new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new APIError('Request timed out', { isTimeoutError: true }));
        }, 2000);
      }),
      'Simulating timeout...',
      'Request took too long',
      { timeout: 1000 } // Set lower timeout to force timeout error
    );
  }, [executeRequest]);

  // Simulate a server error
  const handleServerError = useCallback(async () => {
    await executeRequest(
      () => Promise.reject(new APIError('Internal server error', { status: 500 })),
      'Simulating server error...',
      'Server encountered an error'
    );
  }, [executeRequest]);

  // Simulate an unauthorized error
  const handleUnauthorizedError = useCallback(async () => {
    await executeRequest(
      () => Promise.reject(new APIError('Unauthorized', { status: 401 })),
      'Simulating unauthorized error...',
      'Authentication failed'
    );
  }, [executeRequest]);

  // Demonstrate direct error context usage
  const handleManualError = useCallback(() => {
    showError(
      'This is a manually triggered error',
      'toast'
    );
  }, [showError]);

  // Demonstrate using the error boundary
  const handleCrashError = useCallback(() => {
    // This will trigger the ErrorBoundary
    throw new Error('This is a simulated crash');
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Typography variant="h4" style={styles.title}>
        Error Handling Examples
      </Typography>
      
      <Card style={styles.card}>
        <Typography variant="h6">Network Error</Typography>
        <Typography variant="body2" style={styles.description}>
          Simulates a network connection error
        </Typography>
        <Button
          title="Trigger Network Error"
          onPress={handleNetworkError}
          style={styles.button}
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">Timeout Error</Typography>
        <Typography variant="body2" style={styles.description}>
          Simulates a request that takes too long
        </Typography>
        <Button
          title="Trigger Timeout Error"
          onPress={handleTimeoutError}
          style={styles.button}
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">Server Error</Typography>
        <Typography variant="body2" style={styles.description}>
          Simulates a 500 internal server error
        </Typography>
        <Button
          title="Trigger Server Error"
          onPress={handleServerError}
          style={styles.button}
          variant="outline"
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">Authentication Error</Typography>
        <Typography variant="body2" style={styles.description}>
          Simulates a 401 unauthorized error
        </Typography>
        <Button
          title="Trigger Auth Error"
          onPress={handleUnauthorizedError}
          style={styles.button}
          variant="outline"
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">Manual Error</Typography>
        <Typography variant="body2" style={styles.description}>
          Manually shows an error using the error context
        </Typography>
        <Button
          title="Show Manual Error"
          onPress={handleManualError}
          style={styles.button}
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">App Crash</Typography>
        <Typography variant="body2" style={styles.description}>
          Triggers the ErrorBoundary by crashing the component
        </Typography>
        <Button
          title="Trigger App Crash"
          onPress={handleCrashError}
          style={styles.button}
          variant="secondary"
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  description: {
    marginBottom: 12,
    color: theme.colors.text.secondary,
  },
  button: {
    alignSelf: 'flex-start',
  },
});

export default ErrorHandlingScreen; 