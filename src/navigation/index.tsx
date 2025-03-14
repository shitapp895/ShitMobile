import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './RootNavigator';
import { theme } from '../theme';

/**
 * Navigation entry point that wraps the entire app
 * with necessary providers
 */
const Navigation: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer
        theme={{
          dark: false,
          colors: {
            primary: theme.colors.primary.main,
            background: theme.colors.background.default,
            card: theme.colors.background.paper,
            text: theme.colors.text.primary,
            border: theme.colors.gray[300],
            notification: theme.colors.ui.error,
          },
          fonts: {
            // Default fonts for the navigation theme
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System-Bold',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'System-Bold',
              fontWeight: '800',
            },
          },
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Re-export navigators for easy access
export { default as RootNavigator } from './RootNavigator';
export { default as AuthNavigator } from './AuthNavigator';
export { default as MainNavigator } from './MainNavigator';

// Export types
export * from './types';

export default Navigation; 