import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, TrendingUp, Target, Shield, CreditCard, PieChart, Calendar,
  Settings, LogOut, TrendingDown, Bell, Tags, RefreshCw, X,
} from 'lucide-react';
import { cn } from '../hooks/useThemeClasses';

interface NavSheetProps {
  open: boolean;
  onClose: () => void;
  user?: { name?: string } | null;
  onLogout: () => void;
  alertCount?: number;
}

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

const NavSheet: React.FC<NavSheetProps> = ({ open, onClose, user, onLogout, alertCount = 0 }) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Swipe-down to close gesture
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 60) onClose(); // swipe down > 60px closes
    touchStartY.current = null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'lg:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          backgroundColor: 'var(--color-card-bg)',
          maxHeight: '85dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            className="w-9 h-1 rounded-full"
            style={{ backgroundColor: 'var(--color-border-secondary)' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--color-border-primary)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Navigation
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:[background-color:var(--color-bg-secondary)]"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items — scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {/* 2-column grid for quick access */}
          <div className="grid grid-cols-2 gap-1 mb-3">
            {navItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[52px]',
                    isActive
                      ? 'bg-[color:var(--color-accent-primary)]/10 text-[color:var(--color-accent-primary)]'
                      : 'hover:[background-color:var(--color-bg-secondary)] text-[color:var(--color-text-secondary)]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className="h-4 w-4 flex-shrink-0"
                      style={isActive ? { color: 'var(--color-accent-primary)' } : { color: 'var(--color-text-tertiary)' }}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t mb-2" style={{ borderColor: 'var(--color-border-primary)' }} />

          {/* Remaining items — single column */}
          <div className="space-y-0.5">
            {navItems.slice(4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-[color:var(--color-accent-primary)]/10 text-[color:var(--color-accent-primary)]'
                      : 'hover:[background-color:var(--color-bg-secondary)] text-[color:var(--color-text-secondary)]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className="h-4 w-4 flex-shrink-0"
                      style={isActive ? { color: 'var(--color-accent-primary)' } : { color: 'var(--color-text-tertiary)' }}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.showBadge && alertCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                        {alertCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer: user + logout */}
        <div
          className="flex-shrink-0 border-t px-4 pt-3 pb-1 flex items-center justify-between"
          style={{ borderColor: 'var(--color-border-primary)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {user?.name}
            </span>
          </div>
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors hover:[background-color:var(--color-error-bg)]"
            style={{ color: 'var(--color-error)' }}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default NavSheet;
