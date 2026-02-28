import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CreditCard, Target, PieChart, MoreHorizontal } from 'lucide-react';
import { cn } from '../hooks/useThemeClasses';

interface BottomNavProps {
  onMoreClick: () => void;
  alertCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ onMoreClick, alertCount = 0 }) => {
  const primaryItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/reports', icon: PieChart, label: 'Reports' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t"
      style={{
        backgroundColor: 'var(--color-card-bg)',
        borderColor: 'var(--color-border-primary)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-16">
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                isActive
                  ? 'text-[color:var(--color-accent-primary)]'
                  : 'text-[color:var(--color-text-tertiary)]'
              )
            }
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-7 rounded-full transition-colors',
                    isActive && 'bg-[color:var(--color-accent-primary)]/10'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={onMoreClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)] relative"
          aria-label="More navigation"
        >
          <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors relative">
            <MoreHorizontal className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 right-0 h-4 w-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white bg-red-500 leading-none">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
