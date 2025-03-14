import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export type ErrorVariant = 'inline' | 'banner' | 'toast';

export interface ErrorMessageProps {
  message: string;
  variant?: ErrorVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onRetry?: () => void;
  retryText?: string;
  onDismiss?: () => void;
}

/**
 * ErrorMessage component to display error messages
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  variant = 'inline',
  style,
  textStyle,
  onRetry,
  retryText = 'Retry',
  onDismiss,
}) => {
  const containerStyle = [styles.container, styles[variant], style];

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        <Ionicons
          name="alert-circle"
          size={24}
          color={variant === 'inline' ? theme.colors.ui.error : theme.colors.common.white}
          style={styles.icon}
        />
        <Text style={[
          styles.text,
          styles[`${variant}Text`],
          textStyle
        ]}>
          {message}
        </Text>
      </View>

      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.button}>
            <Text style={[styles.buttonText, styles[`${variant}ButtonText`]]}>
              {retryText}
            </Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons
              name="close"
              size={20}
              color={variant === 'inline' ? theme.colors.ui.error : theme.colors.common.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.sm,
  },
  inline: {
    backgroundColor: theme.colors.ui.error + '15', // 15% opacity
    borderWidth: 1,
    borderColor: theme.colors.ui.error + '30', // 30% opacity
  },
  banner: {
    backgroundColor: theme.colors.ui.error,
    width: '100%',
  },
  toast: {
    backgroundColor: theme.colors.ui.error,
    shadowColor: theme.colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
  },
  inlineText: {
    color: theme.colors.ui.error,
  },
  bannerText: {
    color: theme.colors.common.white,
  },
  toastText: {
    color: theme.colors.common.white,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginLeft: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  inlineButtonText: {
    color: theme.colors.ui.error,
  },
  bannerButtonText: {
    color: theme.colors.common.white,
  },
  toastButtonText: {
    color: theme.colors.common.white,
  },
  dismissButton: {
    marginLeft: theme.spacing.sm,
  },
});

export default ErrorMessage; 