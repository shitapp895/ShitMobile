import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  
  if (!theme) {
    // Fallback theme if used outside ThemeProvider
    return {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        background: '#FFFFFF',
        card: '#F2F2F7',
        text: '#000000',
        border: '#C7C7CC',
        notification: '#FF3B30',
        error: '#FF3B30',
        success: '#34C759',
        warning: '#FFCC00',
        info: '#007AFF',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
      },
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
      },
    };
  }
  
  return theme;
}; 