import { colors, spacing, typography, borderRadius, shadows } from './theme';

/**
 * Helper function to create a styled component prop using theme color values
 * @param colorPath - Path in the color object (e.g., "primary.main")
 * @returns The color value
 */
export const getColor = (colorPath: string): string => {
  const parts = colorPath.split('.');
  let result: any = colors;
  
  for (const part of parts) {
    if (result && result[part] !== undefined) {
      result = result[part];
    } else {
      console.warn(`Color path "${colorPath}" is invalid`);
      return '';
    }
  }
  
  return typeof result === 'string' ? result : '';
};

/**
 * Helper function to get spacing values
 * @param size - Spacing size key or number
 * @returns The spacing value in pixels
 */
export const getSpacing = (size: keyof typeof spacing | number): number => {
  if (typeof size === 'number') {
    return size;
  }
  
  return spacing[size] || spacing.md;
};

/**
 * Helper function to get font size
 * @param size - Font size key
 * @returns The font size value
 */
export const getFontSize = (size: keyof typeof typography.fontSize): number => {
  return typography.fontSize[size] || typography.fontSize.md;
};

/**
 * Helper function to get border radius
 * @param size - Border radius key
 * @returns The border radius value
 */
export const getBorderRadius = (size: keyof typeof borderRadius): number => {
  return borderRadius[size] || borderRadius.md;
};

/**
 * Helper function to get shadow
 * @param size - Shadow key
 * @returns The shadow value
 */
export const getShadow = (size: keyof typeof shadows): string => {
  return shadows[size] || shadows.none;
};

/**
 * Creates a responsive spacing value based on screen size
 * @param options - Object with different spacing for different screen sizes
 * @returns The appropriate spacing value
 */
export const responsiveSpacing = (options: {
  base: keyof typeof spacing | number;
  sm?: keyof typeof spacing | number;
  md?: keyof typeof spacing | number;
  lg?: keyof typeof spacing | number;
}): number => {
  // In a real implementation, this would check screen size
  // For now, we'll just return the base value
  return getSpacing(options.base);
}; 