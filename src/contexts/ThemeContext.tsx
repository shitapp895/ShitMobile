import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { theme as defaultTheme } from '../theme';

// Define the theme context type
type ThemeContextType = typeof defaultTheme;

// Create the context with default theme
export const ThemeContext = createContext<ThemeContextType>(defaultTheme);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider component for providing theme throughout the app
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeContextType>(defaultTheme);

  // Update theme based on system color scheme changes
  useEffect(() => {
    // You can implement dark mode switching here if needed
    // For now, we're just using the default theme
    setTheme(defaultTheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}; 