import React from 'react';
import { Text, StyleSheet, TextProps, TextStyle } from 'react-native';
import { theme } from '../../../theme';

export type TypographyVariant = 
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 
  'subtitle1' | 'subtitle2' | 
  'body1' | 'body2' | 
  'button' | 'caption' | 'overline';

export type TypographyAlign = 'left' | 'center' | 'right';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TypographyAlign;
  style?: TextStyle;
  children: React.ReactNode;
  numberOfLines?: number;
}

/**
 * Typography component for consistent text styling
 */
const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  color,
  align = 'left',
  style,
  children,
  numberOfLines,
  ...rest
}) => {
  return (
    <Text
      style={[
        styles.common,
        styles[variant],
        align !== 'left' && { textAlign: align },
        color && { color },
        style,
      ]}
      numberOfLines={numberOfLines}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  common: {
    color: theme.colors.text.primary,
  },
  h1: {
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: '700',
    lineHeight: theme.typography.fontSize['5xl'] * theme.typography.lineHeight.tight,
  },
  h2: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: '700',
    lineHeight: theme.typography.fontSize['4xl'] * theme.typography.lineHeight.tight,
  },
  h3: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: '600',
    lineHeight: theme.typography.fontSize['3xl'] * theme.typography.lineHeight.tight,
  },
  h4: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '600',
    lineHeight: theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight,
  },
  h5: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    lineHeight: theme.typography.fontSize.xl * theme.typography.lineHeight.tight,
  },
  h6: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.tight,
  },
  subtitle1: {
    fontSize: theme.typography.fontSize.lg,
    lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.normal,
  },
  subtitle2: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.normal,
  },
  body1: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
  },
  body2: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  button: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
  },
  overline: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

export default Typography; 