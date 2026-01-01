import React, { useRef } from 'react';
import { CalendarDays, Download, TrendingUp, ShoppingCart, Utensils, Plane, ShoppingBag, PiggyBank, Car } from 'lucide-react';
import { cn } from '../../hooks/useThemeClasses';
import { formatCurrency } from '../../utils/formatters';
import { downloadElementPng } from '../../utils/download';

export interface CategoryStat {
  id: string;
  name: string;
  amount: number;
  icon?: React.ReactNode;
}

export interface YearInReviewStats {
  year: number;
  totalTransactions: number;
  avgDaily: number;
  deltaPercent?: number; // vs previous year
  topCategories: CategoryStat[]; // sorted desc by amount
}

interface YearInReviewCardProps {
  stats: YearInReviewStats;
  onViewAllCategories?: () => void;
}

const iconForCategory = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('grocery') || n.includes('supermarket')) return <ShoppingCart className="h-6 w-6" />;
  if (n.includes('dining') || n.includes('restaurant') || n.includes('food')) return <Utensils className="h-6 w-6" />;
  if (n.includes('travel') || n.includes('flight')) return <Plane className="h-6 w-6" />;
  if (n.includes('shopping') || n.includes('retail')) return <ShoppingBag className="h-6 w-6" />;
  if (n.includes('savings')) return <PiggyBank className="h-6 w-6" />;
  if (n.includes('uber') || n.includes('transport') || n.includes('cab')) return <Car className="h-6 w-6" />;
  return <ShoppingBag className="h-6 w-6" />;
};

const YearInReviewCard: React.FC<YearInReviewCardProps> = ({ stats, onViewAllCategories }) => {
  const { year, totalTransactions, avgDaily, topCategories } = stats;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-[600px] h-[700px] bg-gray-900 dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5 mx-auto">
      {/* Subtle gradient top */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none" />

      {/* Header */}
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
        <button
          className="group flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Download"
          onClick={() => {
            if (containerRef.current) {
              downloadElementPng(containerRef.current, `year-review-${year}-transactions.png`, 600, 700);
            }
          }}
        >
          <Download className="text-white/70 group-hover:text-white h-5 w-5" />
        </button>
      </div>

      {/* Hero metric */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-8 pb-4">
        <h1 className="text-white text-[64px] sm:text-[80px] font-extrabold leading-none tracking-tight drop-shadow-lg">
          {totalTransactions.toLocaleString()}
        </h1>
        <p className="text-gray-300 text-lg font-medium mt-2">Total Transactions</p>
      </div>

      {/* Navigation arrows are rendered outside the card by the overlay container */}

      {/* Secondary strip - single line */}
      <div className="relative z-10 flex justify-center mb-6 px-6">
        <div className="flex items-center gap-2 text-gray-300">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">Avg. Daily</span>
          <span className="text-white text-sm font-bold">{avgDaily.toFixed(1)}</span>
          <span className="text-gray-400 text-sm">Transactions</span>
        </div>
      </div>

      {/* Categories */}
      <div className="relative z-10 flex-1 bg-gradient-to-t from-black/20 to-transparent p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-bold tracking-tight">Top Categories</h2>
          {onViewAllCategories && (
            <button onClick={onViewAllCategories} className="text-blue-500 hover:text-blue-400 text-sm font-semibold transition-colors">View All</button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center content-center gap-3 flex-1">
          {topCategories.slice(0, 7).map((c, idx) => {
            const size = idx === 0 ? 'h-40 w-40' : idx <= 2 ? 'h-32 w-32' : idx <= 4 ? 'h-24 w-24' : 'h-20 w-20';
            const variant = idx === 0 ? 'bg-blue-600 hover:bg-blue-600/90 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)]' : idx <= 2 ? 'bg-gray-800 border border-white/5' : idx <= 4 ? 'bg-white/5 border border-white/10 backdrop-blur-sm' : 'bg-gray-800 border border-white/5';
            return (
              <div key={c.id} className={cn('group cursor-pointer flex flex-col items-center justify-center rounded-full transform hover:scale-105 transition-all duration-300', size, variant)}>
                <div className={cn('mb-1', idx === 0 ? 'text-white' : 'text-gray-300')}>{c.icon || iconForCategory(c.name)}</div>
                <span className={cn('font-bold', idx === 0 ? 'text-white text-lg' : idx <= 2 ? 'text-white text-base' : 'text-white text-sm')}>{c.name}</span>
                <span className={cn('font-medium', idx === 0 ? 'text-white/80 text-sm' : 'text-gray-400 text-xs')}>{formatCurrency(c.amount)}</span>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-4">
          <p className="text-gray-500 text-xs">Data collected from Jan 1, {year} to Dec 31, {year}</p>
        </div>
      </div>
    </div>
  );
};

export default YearInReviewCard;
