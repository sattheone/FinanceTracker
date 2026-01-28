import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  Target,
  Shield,
  CreditCard,
  PieChart,
  Calendar,
  Settings,
  LogOut,
  User,
  TrendingDown,
  Moon,
  Sun,
  Bell,
  Tags,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import AlertService from '../services/AlertService';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 256; // w-64 = 16rem = 256px

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDataLoaded } = useData();
  const { actualTheme, toggleTheme } = useTheme();
  const theme = useThemeClasses();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
    setSidebarWidth(newWidth);
  }, [isResizing]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/categories', icon: Tags, label: 'Categories' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/recurring', icon: Calendar, label: 'Recurring & Bills' },
    { to: '/assets', icon: TrendingUp, label: 'Assets' },
    { to: '/liabilities', icon: TrendingDown, label: 'Liabilities' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    { to: '/reports', icon: PieChart, label: 'Reports' },
    { to: '/forecast', icon: Calendar, label: 'Forecast' },
    { to: '/alerts', icon: Bell, label: 'Alerts', showBadge: true },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Calculate alert count
  const { transactions, bills, bankAccounts, monthlyBudget } = useData();
  const alerts = AlertService.generateAlerts(transactions, bills, bankAccounts, monthlyBudget);
  const alertCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;

  const closeSidebar = () => setSidebarOpen(false);

  if (!isDataLoaded) {
    return (
      <div className={cn(theme.page, 'flex items-center justify-center')}>
        <div className={theme.loading}>
          <div className="text-center">
            <div className={theme.spinner}></div>
            <p className={cn(theme.textMuted, 'mt-4')}>Loading your financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.page}>
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className={cn(theme.bgElevated, theme.border, 'border-b shadow-sm sticky top-0 z-40')} role="banner">
        <div className="px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 lg:h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h1 className={cn(theme.textPrimary, 'ml-2 text-lg lg:text-xl font-bold')}>
                <span className="hidden sm:inline">FinanceTracker</span>
                <span className="sm:hidden">Finance</span>
              </h1>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className={cn(theme.textSecondary, 'hidden md:flex items-center text-sm')} role="status" aria-live="polite">
                <User className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Welcome, {user?.name}</span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={cn(theme.interactive, 'p-2')}
                title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
                aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
              >
                {actualTheme === 'light' ? (
                  <Moon className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={logout}
                className={cn(theme.interactive, 'flex items-center text-sm px-2 lg:px-3 py-2')}
                aria-label="Logout from your account"
              >
                <LogOut className="h-4 w-4 lg:mr-2" aria-hidden="true" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className="flex">
        {/* Sidebar - Hidden on mobile, shown on lg+ */}
        <nav
          className={cn(
            theme.bgElevated,
            theme.border,
            'fixed lg:static inset-y-0 left-0 z-50 shadow-lg lg:shadow-sm min-h-screen border-r flex-shrink-0 lg:relative',
            'transform transition-transform duration-300 ease-in-out lg:transform-none',
            // Visibility: slide off-screen on mobile when closed
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            // Width: fixed w-64 on mobile, variable on desktop
            'w-64 lg:w-[var(--sidebar-width)]'
          )}
          style={{ ['--sidebar-width' as any]: `${sidebarWidth}px` }}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Mobile sidebar header */}
          <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className={cn(theme.textPrimary, 'ml-2 font-bold')}>FinanceTracker</span>
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] lg:h-auto">
            <ul className="space-y-1" role="list">
              {navItems.map((item) => (
                <li key={item.to} role="listitem">
                  <NavLink
                    to={item.to}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      cn(
                        theme.navLink,
                        isActive ? theme.navLinkActive : theme.navLinkInactive
                      )
                    }
                    aria-current={undefined}
                  >
                    <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    {item.label}
                    {item.showBadge && alertCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {alertCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Resize Handle - only visible on desktop */}
          <div
            className={cn(
              "hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-10",
              isResizing ? "bg-blue-500" : "bg-transparent hover:bg-blue-400"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
        </nav>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(theme.bgPrimary, 'flex-1 p-4 lg:p-6 min-h-screen')}
          role="main"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;