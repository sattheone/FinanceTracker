import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import AlertService from '../services/AlertService';
import BottomNav from './BottomNav';
import NavSheet from './NavSheet';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 256; // w-64 = 16rem = 256px

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDataLoaded } = useData();
  const { actualTheme, toggleTheme } = useTheme();
  const theme = useThemeClasses();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
    { to: '/recurring', icon: RefreshCw, label: 'Recurring & Bills' },
    { to: '/assets', icon: TrendingUp, label: 'Assets' },
    { to: '/liabilities', icon: TrendingDown, label: 'Liabilities' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    { to: '/reports', icon: PieChart, label: 'Reports' },
    { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
    { to: '/alerts', icon: Bell, label: 'Alerts', showBadge: true },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Calculate alert count
  const { transactions, bills, bankAccounts, monthlyBudget } = useData();
  const alerts = AlertService.generateAlerts(transactions, bills, bankAccounts, monthlyBudget);
  const alertCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;

  const isCategoriesPage = location.pathname === '/categories';
  const isFullHeightPage = isCategoriesPage || location.pathname === '/transactions';

  if (!isDataLoaded) {
    return (
      <div className={cn(theme.page, 'flex items-center justify-center')}>
        <div className={theme.loading}>
          <div className="text-center">
            <div className={theme.spinner}></div>
            <p className={cn(theme.textMuted, 'mt-4 text-sm')}>Loading your financial data…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(theme.page, 'h-[100dvh] flex flex-col overflow-hidden fixed-layout')}>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)] px-4 py-2 rounded-full z-50"
      >
        Skip to main content
      </a>

      {/* ── Compact Header ── */}
      <header
        className="sticky top-0 z-40 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border-primary)' }}
        role="banner"
      >
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 lg:h-14">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 flex-shrink-0" style={{ color: 'var(--color-highlight)' }} />
              <span className={cn(theme.textPrimary, 'text-base font-bold tracking-tight')}>
                <span className="hidden sm:inline">FinanceTracker</span>
                <span className="sm:hidden">Finance</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className={cn(theme.textSecondary, 'hidden md:flex items-center text-sm mr-2')}>
                <User className="h-4 w-4 mr-1.5" aria-hidden="true" />
                <span className="truncate max-w-[120px]">{user?.name}</span>
              </div>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:[background-color:var(--color-bg-secondary)]"
                title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
                aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {actualTheme === 'light' ? (
                  <Moon className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                  <Sun className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
              </button>

              <button
                onClick={logout}
                className="hidden lg:flex items-center text-sm px-3 py-2 rounded-xl transition-colors min-h-[44px] hover:[background-color:var(--color-bg-secondary)]"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Sidebar ── */}
        <nav
          className={cn(
            'fixed lg:static inset-y-0 left-0 z-50 flex-shrink-0 border-r flex flex-col',
            'transform transition-transform duration-300 ease-in-out lg:transform-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            'w-72 lg:w-[var(--sidebar-width)]'
          )}
          style={{
            ['--sidebar-width' as any]: `${sidebarWidth}px`,
            backgroundColor: 'var(--color-card-bg)',
            borderColor: 'var(--color-border-primary)',
          }}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Mobile sidebar header */}
          <div
            className="lg:hidden flex items-center justify-between h-12 px-4 border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-border-primary)' }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: 'var(--color-highlight)' }} />
              <span className={cn(theme.textPrimary, 'font-bold text-sm')}>FinanceTracker</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:[background-color:var(--color-bg-secondary)]"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto py-3 px-3">
            <ul className="space-y-0.5" role="list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                        isActive
                          ? 'bg-[color:var(--color-accent-primary)]/10 text-[color:var(--color-accent-primary)] font-semibold'
                          : 'text-[color:var(--color-text-secondary)] hover:[background-color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.showBadge && alertCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {alertCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Sidebar footer — user + logout */}
          <div className="flex-shrink-0 border-t px-3 py-3" style={{ borderColor: 'var(--color-border-primary)' }}>
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className={cn(theme.textSecondary, 'text-sm truncate flex-1')}>{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[44px] hover:[background-color:var(--color-bg-secondary)]"
              style={{ color: 'var(--color-error)' }}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Desktop resize handle */}
          <div
            className={cn(
              'hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors z-10',
              isResizing
                ? 'bg-[var(--color-border-secondary)]'
                : 'bg-transparent hover:bg-[var(--color-border-secondary)]'
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
        </nav>

        {/* ── Main content ── */}
        <main
          id="main-content"
          className={cn(
            'flex-1 min-w-0',
            isFullHeightPage
              ? 'overflow-hidden p-0'
              : 'overflow-y-auto p-3 lg:p-5 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-5'
          )}
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
          role="main"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      <BottomNav
        onMoreClick={() => setSheetOpen(true)}
        alertCount={alertCount}
      />

      {/* ── Mobile nav sheet (More → bottom sheet) ── */}
      <NavSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        user={user}
        onLogout={logout}
        alertCount={alertCount}
      />
    </div>
  );
};

export default Layout;