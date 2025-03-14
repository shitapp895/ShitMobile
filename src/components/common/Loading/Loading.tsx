import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

interface LoadingProps {
  text?: string;
  size?: 'small' | 'large';
  color?: string;
}

/**
 * Loading component to display a spinner with optional text
 */
const Loading: React.FC<LoadingProps> = ({ 
  text, 
  size = 'large',
  color = theme.colors.primary.main
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={[styles.text, { color: theme.colors.text.primary }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
  },
});

export default Loading; 