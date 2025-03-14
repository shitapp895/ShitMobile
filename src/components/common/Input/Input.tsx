import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  secure?: boolean;
  touched?: boolean;
}

/**
 * Input component for form fields
 */
const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  secure = false,
  touched = false,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secure);
  
  const getBorderColor = () => {
    if (error && touched) return theme.colors.ui.error;
    if (isFocused) return theme.colors.primary.main;
    return theme.colors.gray[300];
  };
  
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        { borderColor: getBorderColor() },
        isFocused && styles.focused
      ]}>
        {leftIcon && (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            inputStyle,
            leftIcon ? { paddingLeft: 0 } : null,
            (rightIcon || secure) ? { paddingRight: 0 } : null
          ]}
          secureTextEntry={!isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={theme.colors.gray[400]}
          {...rest}
        />
        
        {secure ? (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.iconContainer}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.gray[500]}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.iconContainer}>
            {rightIcon}
          </View>
        ) : null}
      </View>
      
      {error && touched && (
        <Text style={[styles.error, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.secondary,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.default,
    borderColor: theme.colors.gray[300],
  },
  focused: {
    borderColor: theme.colors.primary.main,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
  },
  iconContainer: {
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.ui.error,
    marginTop: theme.spacing.xs,
  },
});

export default Input; 