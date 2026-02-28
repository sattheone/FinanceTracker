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
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
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
    <div className="metric-card relative group cursor-help">
      {tooltipContent && (
        <div className="absolute z-50 invisible group-hover:visible text-white text-xs rounded-xl py-2 px-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-52 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ backgroundColor: 'var(--color-gray-900, #111)' }}>
          {tooltipContent}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: 'var(--color-gray-900, #111)' }}></div>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>{title}</p>
          <p className="text-lg sm:text-xl font-bold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
            {formatValue(value)}
          </p>
          {trend && (
            <p className="text-xs mt-0.5 font-medium" style={{ color: trend.isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>
              {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </p>
          )}
        </div>
        <div className={`p-2 rounded-xl flex-shrink-0 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;