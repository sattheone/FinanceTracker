// WCAG AA compliant color utilities

export const colors = {
  // Light theme colors (WCAG AA compliant)
  light: {
    primary: {
      text: '#1f2937', // gray-800
      textSecondary: '#4b5563', // gray-600
      textMuted: '#6b7280', // gray-500
      background: '#ffffff',
      backgroundSecondary: '#f9fafb', // gray-50
      border: '#e5e7eb', // gray-200
      accent: '#2563eb', // blue-600
      success: '#059669', // emerald-600
      warning: '#d97706', // amber-600
      error: '#dc2626', // red-600
    }
  },
  
  // Dark theme colors (WCAG AA compliant)
  dark: {
    primary: {
      text: '#f9fafb', // gray-50
      textSecondary: '#d1d5db', // gray-300
      textMuted: '#9ca3af', // gray-400
      background: '#111827', // gray-900
      backgroundSecondary: '#1f2937', // gray-800
      border: '#374151', // gray-700
      accent: '#3b82f6', // blue-500
      success: '#10b981', // emerald-500
      warning: '#f59e0b', // amber-500
      error: '#ef4444', // red-500
    }
  }
};

// Utility function to get contrast-compliant colors
export const getContrastColor = (colorName: keyof typeof colors.light.primary, theme: 'light' | 'dark') => {
  return colors[theme].primary[colorName];
};

// WCAG AA contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)
export const contrastRatios = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5
};

// Status colors with proper contrast
export const statusColors = {
  light: {
    success: {
      bg: '#ecfdf5', // emerald-50
      border: '#a7f3d0', // emerald-200
      text: '#065f46', // emerald-800
      icon: '#059669' // emerald-600
    },
    warning: {
      bg: '#fffbeb', // amber-50
      border: '#fde68a', // amber-200
      text: '#92400e', // amber-800
      icon: '#d97706' // amber-600
    },
    error: {
      bg: '#fef2f2', // red-50
      border: '#fecaca', // red-200
      text: '#991b1b', // red-800
      icon: '#dc2626' // red-600
    },
    info: {
      bg: '#eff6ff', // blue-50
      border: '#bfdbfe', // blue-200
      text: '#1e40af', // blue-800
      icon: '#2563eb' // blue-600
    }
  },
  dark: {
    success: {
      bg: '#064e3b', // emerald-900
      border: '#065f46', // emerald-800
      text: '#a7f3d0', // emerald-200
      icon: '#34d399' // emerald-400
    },
    warning: {
      bg: '#92400e', // amber-800
      border: '#b45309', // amber-700
      text: '#fde68a', // amber-200
      icon: '#fbbf24' // amber-400
    },
    error: {
      bg: '#991b1b', // red-800
      border: '#b91c1c', // red-700
      text: '#fecaca', // red-200
      icon: '#f87171' // red-400
    },
    info: {
      bg: '#1e3a8a', // blue-800
      border: '#1e40af', // blue-700
      text: '#bfdbfe', // blue-200
      icon: '#60a5fa' // blue-400
    }
  }
};

export default colors;