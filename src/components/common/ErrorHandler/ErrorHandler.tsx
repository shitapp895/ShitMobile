import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useError } from '../../../contexts/ErrorContext';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import { theme } from '../../../theme';

/**
 * ErrorHandler component that displays error messages from ErrorContext
 */
const ErrorHandler: React.FC = () => {
  const { error, hideError } = useError();
  
  if (!error || !error.visible) {
    return null;
  }
  
  // Different positioning based on error type
  const containerStyle = [
    styles.container,
    error.type === 'banner' && styles.bannerContainer,
    error.type === 'toast' && styles.toastContainer,
  ];
  
  return (
    <View style={containerStyle}>
      <ErrorMessage
        message={error.message}
        variant={error.type}
        onDismiss={hideError}
        onRetry={error.retryAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.sm,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: theme.zIndex.tooltip,
  },
  toastContainer: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: theme.zIndex.tooltip,
  },
});

export default ErrorHandler; 