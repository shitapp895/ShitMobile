import React from 'react';
import {
  View,
  StyleSheet,
  ViewProps,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../../theme';

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: TouchableOpacityProps['onPress'];
}

/**
 * Card component for containing content in a styled container
 */
const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
  onPress,
  ...rest
}) => {
  const cardStyle = [
    styles.card,
    styles[variant],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  default: {
    // Default card style already applied in "card"
  },
  elevated: {
    shadowColor: theme.colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: theme.colors.background.default,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
});

export default Card; 