import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { theme } from '../../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Button component for common UI actions
 */
const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  disabled,
  leftIcon,
  rightIcon,
  ...rest
}) => {
  const getButtonStyles = (): ViewStyle => {
    let buttonStyle: ViewStyle = {
      ...styles.button,
      ...styles[`${variant}Button`],
      ...styles[`${size}Button`],
    };
    
    if (fullWidth) {
      buttonStyle = { ...buttonStyle, ...styles.fullWidth };
    }
    
    if (disabled || loading) {
      buttonStyle = {
        ...buttonStyle,
        opacity: 0.7,
      };
    }
    
    return buttonStyle;
  };
  
  const getTextStyles = (): TextStyle => {
    return {
      ...styles.text,
      ...styles[`${variant}Text`],
      ...styles[`${size}Text`],
    };
  };
  
  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'text' 
            ? theme.colors.primary.main 
            : theme.colors.common.white} 
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={[getTextStyles(), textStyle]}>{title}</Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary.main,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary.main,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  textButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  smallButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  mediumButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  largeButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: theme.colors.common.white,
  },
  secondaryText: {
    color: theme.colors.common.white,
  },
  outlineText: {
    color: theme.colors.primary.main,
  },
  textText: {
    color: theme.colors.primary.main,
  },
  smallText: {
    fontSize: theme.typography.fontSize.sm,
  },
  mediumText: {
    fontSize: theme.typography.fontSize.md,
  },
  largeText: {
    fontSize: theme.typography.fontSize.lg,
  },
});

export default Button; 