import { useMemo } from 'react';

// Comprehensive theme class utility hook
export const useThemeClasses = () => {
  return useMemo(() => ({
    // Layout & Containers
    page: 'min-h-screen theme-bg-primary',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    
    // Cards & Surfaces
    card: 'theme-card',
    cardHeader: 'theme-text-primary text-lg font-semibold mb-4',
    cardContent: 'theme-text-secondary',
    
    // Typography
    heading1: 'text-3xl font-bold theme-text-primary',
    heading2: 'text-2xl font-semibold theme-text-primary',
    heading3: 'text-lg font-semibold theme-text-primary',
    heading4: 'text-base font-medium theme-text-primary',
    
    textPrimary: 'theme-text-primary',
    textSecondary: 'theme-text-secondary',
    textTertiary: 'theme-text-tertiary',
    textMuted: 'theme-text-muted',
    
    // Buttons
    btnPrimary: 'theme-btn-primary',
    btnSecondary: 'theme-btn-secondary',
    btnDanger: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors',
    btnSuccess: 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors',
    
    // Forms
    input: 'theme-input w-full',
    select: 'theme-input w-full',
    textarea: 'theme-input w-full resize-none',
    label: 'block text-sm font-medium theme-text-secondary mb-2',
    
    // Tables
    table: 'theme-table w-full',
    tableHeader: 'theme-table-header text-left',
    tableRow: 'theme-table-row',
    tableCell: 'theme-table-cell',
    
    // Navigation
    navLink: 'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
    navLinkActive: 'theme-bg-secondary theme-text-primary border-r-2 border-blue-500',
    navLinkInactive: 'theme-text-tertiary hover:theme-bg-secondary hover:theme-text-primary',
    
    // Status & Badges
    badgeSuccess: 'theme-success px-2 py-1 text-xs rounded-full font-medium border',
    badgeWarning: 'theme-warning px-2 py-1 text-xs rounded-full font-medium border',
    badgeError: 'theme-error px-2 py-1 text-xs rounded-full font-medium border',
    badgeInfo: 'theme-info px-2 py-1 text-xs rounded-full font-medium border',
    
    // Interactive Elements
    interactive: 'theme-interactive rounded-lg cursor-pointer',
    dropdown: 'theme-dropdown',
    dropdownItem: 'theme-dropdown-item',
    
    // Borders & Dividers
    border: 'border theme-border-primary',
    borderSecondary: 'border theme-border-secondary',
    divider: 'border-t theme-border-primary',
    
    // Backgrounds
    bgPrimary: 'theme-bg-primary',
    bgSecondary: 'theme-bg-secondary',
    bgTertiary: 'theme-bg-tertiary',
    bgElevated: 'theme-bg-elevated',
    
    // Overlays & Modals
    overlay: 'fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 z-40',
    modal: 'theme-bg-elevated rounded-lg shadow-xl max-w-md w-full mx-4 p-6',
    
    // Loading & Empty States
    loading: 'flex items-center justify-center p-8',
    spinner: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500',
    emptyState: 'text-center py-12',
    emptyStateIcon: 'mx-auto h-12 w-12 theme-text-muted mb-4',
    emptyStateTitle: 'theme-text-primary text-lg font-medium mb-2',
    emptyStateDescription: 'theme-text-muted',
    
    // Metrics & Stats
    metricCard: 'theme-card text-center',
    metricValue: 'text-2xl font-bold theme-text-primary',
    metricLabel: 'text-sm font-medium theme-text-muted',
    
    // Progress & Charts
    progressBar: 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2',
    progressFill: 'h-2 rounded-full transition-all duration-300',
    
    // Alerts & Notifications
    alertSuccess: 'theme-success rounded-lg p-4 border',
    alertWarning: 'theme-warning rounded-lg p-4 border',
    alertError: 'theme-error rounded-lg p-4 border',
    alertInfo: 'theme-info rounded-lg p-4 border',
  }), []);
};

// Utility function to combine theme classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export default useThemeClasses;