// Theme constants for ShitApp
// This defines the core design system

// Color palette
export const colors = {
  // Primary brand colors
  primary: {
    main: '#6366f1', // Indigo color from the bottom tab
    light: '#818cf8',
    dark: '#4f46e5',
    contrastText: '#ffffff',
  },
  // Secondary colors
  secondary: {
    main: '#8b5cf6', // Violet
    light: '#a78bfa',
    dark: '#7c3aed',
    contrastText: '#ffffff',
  },
  // Accent colors
  accent: {
    main: '#ec4899', // Pink
    light: '#f472b6',
    dark: '#db2777',
    contrastText: '#ffffff',
  },
  // UI colors
  ui: {
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444',   // Red
    info: '#3b82f6',    // Blue
  },
  // Grayscale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // Common colors
  common: {
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
  },
  // Background colors
  background: {
    default: '#ffffff',
    paper: '#f3f4f6',
    dark: '#1f2937',
  },
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    disabled: '#9ca3af',
    hint: '#6b7280',
    light: '#ffffff',
  },
  // Action colors
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
  // Social media colors
  social: {
    facebook: '#1877f2',
    twitter: '#1da1f2',
    instagram: '#e1306c',
  },
};

// Typography
export const typography = {
  fontFamily: {
    base: 'System',
    heading: 'System-Bold',
    mono: 'System-Mono',
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

// Spacing system (in pixels)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

// Z-index values
export const zIndex = {
  base: 0,
  elevated: 1,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
};

// Export the complete theme
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
};

export default theme; 