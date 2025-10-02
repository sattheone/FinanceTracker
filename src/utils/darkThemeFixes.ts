// Universal dark theme class mappings for consistent styling

export const darkThemeClasses = {
  // Text colors
  'text-gray-900': 'text-gray-900 dark:text-white',
  'text-gray-800': 'text-gray-800 dark:text-gray-100',
  'text-gray-700': 'text-gray-700 dark:text-gray-200',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  
  // Background colors
  'bg-white': 'bg-white dark:bg-gray-800',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-700',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-700',
  
  // Border colors
  'border-gray-200': 'border-gray-200 dark:border-gray-600',
  'border-gray-300': 'border-gray-300 dark:border-gray-500',
  
  // Status colors with proper contrast
  'text-green-600': 'text-green-600 dark:text-green-400',
  'text-red-600': 'text-red-600 dark:text-red-400',
  'text-blue-600': 'text-blue-600 dark:text-blue-400',
  'text-yellow-600': 'text-yellow-600 dark:text-yellow-400',
  'text-purple-600': 'text-purple-600 dark:text-purple-400',
  
  // Background status colors
  'bg-green-50': 'bg-green-50 dark:bg-green-900/30',
  'bg-red-50': 'bg-red-50 dark:bg-red-900/30',
  'bg-blue-50': 'bg-blue-50 dark:bg-blue-900/30',
  'bg-yellow-50': 'bg-yellow-50 dark:bg-yellow-900/30',
  'bg-purple-50': 'bg-purple-50 dark:bg-purple-900/30',
  
  // Hover states
  'hover:bg-gray-50': 'hover:bg-gray-50 dark:hover:bg-gray-700',
  'hover:bg-gray-100': 'hover:bg-gray-100 dark:hover:bg-gray-600',
};

// Function to apply dark theme classes
export const applyDarkTheme = (className: string): string => {
  let result = className;
  
  Object.entries(darkThemeClasses).forEach(([original, replacement]) => {
    result = result.replace(new RegExp(`\\b${original}\\b`, 'g'), replacement);
  });
  
  return result;
};

export default darkThemeClasses;