import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import PendingSyncSheet from './transactions/PendingSyncSheet';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 256; // w-64 = 16rem = 256px

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDataLoaded, lastSyncTimestamp, isSyncing, forceSync, syncSettings, updateSyncSettings, pendingChangeCount, transactions, bankAccounts, goals, assets, bills, monthlyBudget } = useData();
  const { actualTheme, toggleTheme } = useTheme();
  const theme = useThemeClasses();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [showSyncPopover, setShowSyncPopover] = useState(false);
  const [showPendingSyncSheet, setShowPendingSyncSheet] = useState(false);
  const syncBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSyncPopover) return;
    const handler = (e: MouseEvent) => {
      if (syncBtnRef.current && !syncBtnRef.current.contains(e.target as Node)) {
        setShowSyncPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSyncPopover]);

  const syncIndicatorColor = isSyncing
    ? '#3B82F6'
    : syncSettings.mode === 'manual'
      ? 'var(--color-text-muted)'
      : lastSyncTimestamp && (Date.now() - lastSyncTimestamp) < (syncSettings.autoIntervalMinutes * 60 * 1000)
        ? '#22C55E'
        : '#F59E0B';

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

  const navGroups = [
    {
      title: 'General',
      items: [
        { to: '/', icon: Home, label: 'Dashboard' },
        { to: '/transactions', icon: CreditCard, label: 'Transactions' },
        { to: '/categories', icon: Tags, label: 'Categories' },
        { to: '/calendar', icon: Calendar, label: 'Calendar' },
        { to: '/recurring', icon: RefreshCw, label: 'Recurring & Bills' },
      ]
    },
    {
      title: 'Portfolio',
      items: [
        { to: '/assets', icon: TrendingUp, label: 'Assets' },
        { to: '/liabilities', icon: TrendingDown, label: 'Liabilities' },
        { to: '/goals', icon: Target, label: 'Goals' },
        { to: '/insurance', icon: Shield, label: 'Insurance' },
      ]
    },
    {
      title: 'Analysis',
      items: [
        { to: '/reports', icon: PieChart, label: 'Reports' },
        { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
        { to: '/alerts', icon: Bell, label: 'Alerts', showBadge: true },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  // Calculate alert count (memoized to avoid recalculation on resize / re-render)
  const alertCount = React.useMemo(() => {
    const alerts = AlertService.generateAlerts(transactions, bills, bankAccounts, monthlyBudget);
    return alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;
  }, [transactions, bills, bankAccounts, monthlyBudget]);

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
                title={actualTheme === 'light' ? 'Switch to dark mode' : actualTheme === 'dark' ? 'Switch to tinted mode' : 'Switch to white mode'}
                aria-label={actualTheme === 'light' ? 'Switch to dark mode' : actualTheme === 'dark' ? 'Switch to tinted mode' : 'Switch to white mode'}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {actualTheme === 'dark' ? (
                  <Sun className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : actualTheme === 'tinted' ? (
                  <Sun className="h-4 w-4 lg:h-5 lg:w-5 opacity-70" />
                ) : (
                  <Moon className="h-4 w-4 lg:h-5 lg:w-5" />
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
            {navGroups.map((group) => (
              <div key={group.title} className="mb-4">
                <h4 className="text-[10px] font-bold tracking-wider text-[color:var(--color-text-muted)] uppercase px-3 mb-1">
                  {group.title}
                </h4>
                <ul className="space-y-0.5" role="list">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] duration-150',
                            isActive
                              ? 'bg-[color:var(--color-accent-light)] text-[color:var(--color-accent-primary)] font-semibold border-l-2 border-[color:var(--color-accent-primary)] rounded-r-xl rounded-l-none pl-2.5'
                              : 'text-[color:var(--color-text-secondary)] hover:[background-color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)] pl-3 border-l-2 border-transparent'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-105" aria-hidden="true" />
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
            ))}
          </div>

          {/* Sidebar footer — user + logout */}
          <div className="flex-shrink-0 border-t px-3 py-3" style={{ borderColor: 'var(--color-border-primary)' }}>
            <div ref={syncBtnRef} className="relative">
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className={cn(theme.textSecondary, 'text-sm truncate flex-1 min-w-0')}>{user?.name}</span>
                <button
                  onClick={() => setShowSyncPopover(v => !v)}
                  className="relative flex-shrink-0 p-1.5 rounded-lg transition-colors hover:[background-color:var(--color-bg-secondary)]"
                  title={`Sync: ${syncSettings.mode} — Last synced: ${lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleTimeString() : 'Never'}${pendingChangeCount > 0 ? ` — ${pendingChangeCount} pending` : ''}`}
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5 transition-colors', isSyncing && 'animate-spin')}
                    style={{ color: syncIndicatorColor }}
                  />
                  {pendingChangeCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-bold px-0.5">
                      {pendingChangeCount > 99 ? '99+' : pendingChangeCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Sync popover */}
              {showSyncPopover && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border shadow-2xl z-50 overflow-hidden"
                  style={{ backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border-primary)' }}
                >
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Data &amp; Sync</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: isSyncing ? '#3B82F6' : syncSettings.mode === 'manual' ? '#9CA3AF' : '#22C55E' }} />
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {isSyncing ? 'Syncing…' : lastSyncTimestamp ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSyncTimestamp)) : 'Never synced'}
                      </span>
                    </div>
                  </div>

                  {/* Sync Now */}
                  <div className="px-4 pb-3">
                    <button
                      onClick={forceSync}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#3B82F6' }}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                      {isSyncing ? 'Syncing…' : 'Sync Now'}
                    </button>
                  </div>

                  <div className="border-t" style={{ borderColor: 'var(--color-border-primary)' }} />

                  {/* Records */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    {[
                      { label: 'Transactions', count: transactions.length },
                      { label: 'Accounts', count: bankAccounts.length },
                      { label: 'Goals', count: goals.length },
                      { label: 'Assets', count: assets.length },
                    ].map(({ label, count }) => (
                      <div key={label}>
                        <div className="text-base font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{count}</div>
                        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Pending changes */}
                  {pendingChangeCount > 0 && (
                    <>
                      <div className="border-t" style={{ borderColor: 'var(--color-border-primary)' }} />
                      <div className="px-4 py-2.5">
                        <button
                          onClick={() => { setShowPendingSyncSheet(true); setShowSyncPopover(false); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors text-left"
                          style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-amber-600">
                            {pendingChangeCount} {pendingChangeCount === 1 ? 'change' : 'changes'} pending
                          </span>
                          <span className="ml-auto text-[10px] text-amber-500">View →</span>
                        </button>
                      </div>
                    </>
                  )}

                  <div className="border-t" style={{ borderColor: 'var(--color-border-primary)' }} />

                  {/* Sync mode — segmented */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Sync mode</p>
                    <div className="grid grid-cols-3 gap-0.5 p-0.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      {([
                        { value: 'auto', label: 'Auto' },
                        { value: 'always', label: 'Always' },
                        { value: 'manual', label: 'Manual' },
                      ] as const).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateSyncSettings({ mode: value })}
                          className="py-1.5 rounded-[10px] text-[11px] font-medium transition-all"
                          style={syncSettings.mode === value
                            ? { backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                            : { color: 'var(--color-text-muted)' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {syncSettings.mode === 'auto' ? 'Syncs automatically when data is stale' : syncSettings.mode === 'always' ? 'Syncs every time you open the app' : 'Only syncs when you tap "Sync Now"'}
                    </p>
                  </div>

                  {/* Interval — auto mode only */}
                  {syncSettings.mode === 'auto' && (
                    <div className="px-4 pb-3">
                      <select
                        value={syncSettings.autoIntervalMinutes}
                        onChange={e => updateSyncSettings({ autoIntervalMinutes: Number(e.target.value) as 5 | 15 | 30 | 60 })}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                        style={{
                          backgroundColor: 'var(--color-bg-primary)',
                          borderColor: 'var(--color-border-primary)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <option value={5}>Refresh every 5 min</option>
                        <option value={15}>Refresh every 15 min</option>
                        <option value={30}>Refresh every 30 min</option>
                        <option value={60}>Refresh every 60 min</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
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
              ? 'overflow-hidden p-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0'
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

      {/* ── Pending sync sheet ── */}
      <PendingSyncSheet
        isOpen={showPendingSyncSheet}
        onClose={() => setShowPendingSyncSheet(false)}
      />
    </div>
  );
};

export default Layout;