import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatCurrency, formatLargeNumber } from '../utils/formatters';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  format?: 'currency' | 'large' | 'number';
  tooltipContent?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  format = 'currency',
  tooltipContent
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10 dark:border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 dark:border-emerald-500/20',
    yellow: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10 dark:border-amber-500/20',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10 dark:border-rose-500/20',
    purple: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/10 dark:border-violet-500/20',
  };

  const formatValue = (val: number) => {
    switch (format) {
      case 'large':
        return formatLargeNumber(val);
      case 'number':
        return val.toLocaleString('en-IN');
      default:
        return formatCurrency(val);
    }
  };

  return (
    <div className={`metric-card relative group cursor-help ${tooltipContent ? "hover:z-30 focus:z-30" : ""}`} tabIndex={tooltipContent ? 0 : undefined}>
      {tooltipContent && (
        <div className="absolute z-50 invisible group-hover:visible group-focus:visible text-xs rounded-xl py-2 px-3 top-full left-1/2 transform -translate-x-1/2 mt-2 w-52 max-w-[calc(100vw-2rem)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200" style={{ backgroundColor: 'var(--color-bg-primary, #111)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-primary)' }}>
          {/* Opens below the card: above it, the tooltip ran under the sticky page header and got cut off. */}
          {tooltipContent}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent" style={{ borderBottomColor: 'var(--color-border-primary)' }}></div>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 sm:block" style={{ color: 'var(--color-text-tertiary)' }}>
            {/* Mobile: icon moves inline with the title so the value gets the full card width */}
            <span className={`sm:hidden inline-flex p-1 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">{title}</span>
          </p>
          <p className="text-lg sm:text-2xl font-bold mt-1 tracking-tight whitespace-nowrap" style={{ color: 'var(--color-text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
            {formatValue(value)}
          </p>
          {trend && (
            <div className="mt-1">
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className={`hidden sm:block p-2.5 rounded-xl flex-shrink-0 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;