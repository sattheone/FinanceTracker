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
        <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg py-2 px-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {tooltipContent}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-200 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mt-1 truncate">
            {formatValue(value)}
          </p>
          {trend && (
            <p className={`text-xs sm:text-sm mt-1 font-medium ${trend.isPositive ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ml-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;