import React from 'react';
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

} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import AlertService from '../services/AlertService';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDataLoaded } = useData();
  const { actualTheme, toggleTheme } = useTheme();
  const theme = useThemeClasses();

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
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
      <header className={cn(theme.bgElevated, theme.border, 'border-b shadow-sm')} role="banner">
        <div className={theme.container}>
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h1 className={cn(theme.textPrimary, 'ml-2 text-xl font-bold')}>
                FinanceTracker
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className={cn(theme.textSecondary, 'flex items-center text-sm')} role="status" aria-live="polite">
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
                  <Moon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={logout}
                className={cn(theme.interactive, 'flex items-center text-sm px-3 py-2')}
                aria-label="Logout from your account"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav
          className={cn(theme.bgElevated, theme.border, 'w-64 shadow-sm min-h-screen border-r')}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="p-4">
            <ul className="space-y-2" role="list">
              {navItems.map((item) => (
                <li key={item.to} role="listitem">
                  <NavLink
                    to={item.to}
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
        </nav>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(theme.bgPrimary, 'flex-1 p-6')}
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