import React from 'react';
import { StyleSheet, Modal, View } from 'react-native';
import { useLoading } from '../../../contexts/LoadingContext';
import Loading from '../Loading/Loading';
import { theme } from '../../../theme';

/**
 * LoadingOverlay component displays a loading indicator over the entire screen
 * during global loading states
 */
const LoadingOverlay: React.FC = () => {
  const { isLoading, loadingText } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isLoading}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Loading 
            size="large" 
            text={loadingText || 'Loading...'}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: theme.colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default LoadingOverlay; 