import React from 'react';
import { Share2, CalendarDays } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export interface SpendingItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color?: string;
  amount: number;
}

interface YearInReviewSpendingsCardProps {
  year: number;
  items: SpendingItem[];
  onViewAllCategories?: () => void;
}

const YearInReviewSpendingsCard: React.FC<YearInReviewSpendingsCardProps> = ({ year, items }) => {
  return (
    <div className="relative w-[600px] h-[700px] bg-gray-900 dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5 mx-auto">
      {/* Subtle gradient top */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none" />

      {/* Header (consistent across all cards) */}
      <div className="relative z-10 flex items-center justify-between p-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-white/10 rounded-full h-10 w-10 backdrop-blur-md">
            <CalendarDays className="text-white h-5 w-5" />
          </div>
          <div>
            <h3 className="text-white text-lg font-bold leading-tight">{year} Review</h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Financial Report</p>
          </div>
        </div>
        <button className="group flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors" aria-label="Share">
          <Share2 className="text-white/70 group-hover:text-white h-5 w-5" />
        </button>
      </div>

      {/* Content title (card-specific) */}
      <div className="relative z-10 px-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white text-xl font-bold tracking-tight">Your Spendings</h2>
          <span className="text-gray-400 text-sm">Category Breakdown</span>
        </div>
      </div>

      {/* Content list (scrollable) */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-6">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center min-w-0 flex-1">
                <div
                  className="w-2 h-2 rounded-full mr-3 flex-shrink-0"
                  style={{ backgroundColor: item.color || '#9CA3AF' }}
                />
                {item.icon && <span className="text-xl mr-2 flex-shrink-0">{item.icon}</span>}
                <p className="text-sm font-medium truncate text-white">{item.name}</p>
              </div>
              <p className="text-sm font-semibold text-white ml-4">{formatCurrency(item.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-6">
        <p className="text-gray-500 text-xs">Data collected from Jan 1, {year} to Dec 31, {year}</p>
      </div>
    </div>
  );
};

export default YearInReviewSpendingsCard;
