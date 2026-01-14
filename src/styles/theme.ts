// Initio Learning Trust brand colors and theme
// Based on official Brand Guidelines

export const theme = {
  colors: {
    // Primary colour
    initioBlue: '#283E49',      // RGB(40, 62, 73)

    // Secondary colours
    aquaMarine: '#89CCCA',      // RGB(137, 204, 202)
    initioYellow: '#FFCE32',    // RGB(255, 206, 50)
    initioRed: '#EF776E',       // RGB(239, 119, 110)

    // Colour spectrum (for gradients/accents)
    paleBlue: '#84CFED',        // RGB(132, 207, 237)
    green: '#C5D984',           // RGB(197, 217, 132)
    lime: '#E7E459',            // RGB(231, 228, 89)
    orange: '#F7AA4E',          // RGB(247, 170, 78)
    pink: '#EE7A9D',            // RGB(238, 122, 157)

    // Backgrounds
    paleBackground: '#E4F4F4',
    white: '#FFFFFF',

    // Status colors
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',

    // Text
    textPrimary: '#283E49',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',

    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    hover: '0 4px 12px rgb(0 0 0 / 0.15)',
  },

  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  fonts: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
};

export type Theme = typeof theme;
