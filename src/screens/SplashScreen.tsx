import React from 'react';
import { View, StyleSheet, Image, ViewStyle, TextStyle, ImageStyle, Text } from 'react-native';
import { Typography, Loading } from '../components/common';
import { useTheme } from '../hooks/useTheme';
import { theme as defaultTheme } from '../theme';

// Define theme type based on the actual theme structure
type ThemeType = typeof defaultTheme;

/**
 * Splash screen displayed during app initialization
 */
const SplashScreen: React.FC = () => {
  const theme = useTheme();
  
  return (
    <View style={containerStyle(theme)}>
      <View style={styles.content}>
        {/* Safely use logo if it exists, or display app name */}
        <View style={logoStyle(theme)}>
          <Text style={logoTextStyle(theme)}>💩</Text>
        </View>
        <Typography variant="h4" style={titleStyle(theme)}>
          ShitApp
        </Typography>
        <Typography variant="body2" style={subtitleStyle(theme)}>
          Loading your experience...
        </Typography>
        <Loading size="large" />
      </View>
    </View>
  );
};

// Define typed style functions with proper theme typing
const containerStyle = (theme: ThemeType): ViewStyle => ({
  flex: 1,
  backgroundColor: theme.colors.background.default,
  justifyContent: 'center',
  alignItems: 'center',
});

const logoStyle = (theme: ThemeType): ViewStyle => ({
  width: 120,
  height: 120,
  marginBottom: theme.spacing.md,
  backgroundColor: theme.colors.primary.light,
  borderRadius: 60,
  justifyContent: 'center',
  alignItems: 'center',
});

const logoTextStyle = (theme: ThemeType): TextStyle => ({
  fontSize: 64,
});

const titleStyle = (theme: ThemeType): TextStyle => ({
  marginBottom: theme.spacing.sm,
  color: theme.colors.primary.main,
});

const subtitleStyle = (theme: ThemeType): TextStyle => ({
  marginBottom: theme.spacing.xl,
  color: theme.colors.text.secondary,
});

// Static styles
const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
});

export default SplashScreen; 