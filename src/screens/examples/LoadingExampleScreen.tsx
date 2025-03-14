import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLoading } from '../../contexts/LoadingContext';
import { useAPI } from '../../hooks/useAPI';
import { Button, Card, Typography } from '../../components/common';

/**
 * Example screen demonstrating different ways to use loading states
 */
const LoadingExampleScreen: React.FC = () => {
  const { showLoading, hideLoading, withLoading } = useLoading();
  const { executeRequest, isLoading: apiLoading, error: apiError, reset: resetApi } = useAPI<string>();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  
  // Store timeouts to clean them up on unmount
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Clean up any active timeouts when component unmounts
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(id => clearTimeout(id));
      
      // Also clean up any active loading states
      if (loadingId !== null) {
        hideLoading(loadingId);
      }
      
      // Hide all loading states just in case
      hideLoading();
    };
  }, [hideLoading, loadingId]);

  // Helper to safely create timeouts that will be cleaned up
  const safeTimeout = (callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeoutRefs.current.push(id);
    return id;
  };

  // Example function to simulate an API call
  const simulateApiCall = (delay: number = 2000): Promise<string> => {
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        resolve('API call completed!');
      }, delay);
      timeoutRefs.current.push(id);
    });
  };

  // Example function that might throw an error
  const simulateErrorCall = (): Promise<never> => {
    return new Promise((_, reject) => {
      const id = setTimeout(() => {
        reject(new Error('This is a simulated error'));
      }, 1500);
      timeoutRefs.current.push(id);
    });
  };

  // Basic loading example
  const handleBasicLoading = () => {
    const id = showLoading('Basic loading example...');
    setLoadingId(id);
    
    safeTimeout(() => {
      hideLoading(id);
      setLoadingId(null);
      Alert.alert('Success', 'Basic loading completed!');
    }, 2000);
  };

  // Multiple loading states example
  const handleMultipleLoading = () => {
    // Show first loading state
    const id1 = showLoading('First loading operation...');
    
    // Start a second loading operation after a delay
    safeTimeout(() => {
      const id2 = showLoading('Second loading operation...');
      
      // Complete first operation
      safeTimeout(() => {
        hideLoading(id1);
        
        // Complete second operation
        safeTimeout(() => {
          hideLoading(id2);
          Alert.alert('Success', 'Multiple loading states completed!');
        }, 1500);
      }, 2000);
    }, 1000);
  };

  // Using withLoading helper
  const handleWithLoading = async () => {
    try {
      const result = await withLoading(
        simulateApiCall(3000),
        'Using withLoading helper...'
      );
      
      Alert.alert('Success', `withLoading result: ${result}`);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  // Using useAPI hook for success case
  const handleApiSuccess = async () => {
    const result = await executeRequest(
      () => simulateApiCall(2500),
      'Loading with API hook...',
      'Failed to load data'
    );
    
    if (result) {
      Alert.alert('Success', `API result: ${result}`);
    }
  };

  // Using useAPI hook for error case
  const handleApiError = async () => {
    await executeRequest(
      () => simulateErrorCall(),
      'This will show an error...',
      'Something went wrong with the request',
      {
        keepPreviousDataOnError: true
      }
    );
  };

  // Cancel current loading example
  const handleCancelLoading = () => {
    if (loadingId) {
      hideLoading(loadingId);
      setLoadingId(null);
      Alert.alert('Cancelled', 'Loading was cancelled');
    } else {
      Alert.alert('Info', 'No active loading to cancel');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Typography variant="h4" style={styles.title}>
        Loading Examples
      </Typography>
      
      <Card style={styles.card}>
        <Typography variant="h6">Basic Loading</Typography>
        <Typography variant="body2" style={styles.description}>
          Shows a simple loading overlay for 2 seconds
        </Typography>
        <View style={styles.buttonRow}>
          <Button
            title="Show Basic Loading"
            onPress={handleBasicLoading}
            style={styles.button}
          />
          <Button
            title="Cancel"
            onPress={handleCancelLoading}
            variant="outline"
            style={styles.button}
            disabled={!loadingId}
          />
        </View>
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">Multiple Loading States</Typography>
        <Typography variant="body2" style={styles.description}>
          Demonstrates handling multiple overlapping loading states
        </Typography>
        <Button
          title="Show Multiple Loading"
          onPress={handleMultipleLoading}
          style={styles.button}
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">With Loading Helper</Typography>
        <Typography variant="body2" style={styles.description}>
          Uses the withLoading helper to wrap a promise
        </Typography>
        <Button
          title="With Loading Helper"
          onPress={handleWithLoading}
          style={styles.button}
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">API Hook (Success)</Typography>
        <Typography variant="body2" style={styles.description}>
          Uses the useAPI hook to handle loading with success
        </Typography>
        <Button
          title="API Success Example"
          onPress={handleApiSuccess}
          loading={apiLoading}
          style={styles.button}
        />
      </Card>
      
      <Card style={styles.card}>
        <Typography variant="h6">API Hook (Error)</Typography>
        <Typography variant="body2" style={styles.description}>
          Uses the useAPI hook to handle an error case
        </Typography>
        <Button
          title="API Error Example"
          onPress={handleApiError}
          variant="outline"
          style={styles.button}
        />
        {apiError && (
          <Typography variant="caption" style={styles.errorText}>
            Error: {apiError.message}
          </Typography>
        )}
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
    marginBottom: 24,
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  description: {
    marginVertical: 8,
    opacity: 0.7,
  },
  button: {
    marginTop: 8,
    minWidth: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
});

export default LoadingExampleScreen; 