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
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  format = 'currency'
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
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-200">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mt-1">
            {formatValue(value)}
          </p>
          {trend && (
            <p className={`text-sm mt-1 font-medium ${trend.isPositive ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;