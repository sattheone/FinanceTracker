import React, { useRef } from 'react';
import { CalendarDays, Download, ArrowDownCircle, ArrowUpCircle, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { downloadElementPng } from '../../utils/download';

interface MonthFlow {
  income: number;
  expense: number;
  invest: number;
}

export interface YearInReviewOverviewData {
  year: number;
  totals: { income: number; expense: number; invest: number };
  deltas?: { income: number; expense: number; invest: number };
  monthly: MonthFlow[]; // 12 entries
  peakIncome?: { monthIndex: number; amount: number };
}

interface YearInReviewOverviewCardProps {
  data: YearInReviewOverviewData;
}

const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const YearInReviewOverviewCard: React.FC<YearInReviewOverviewCardProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { year, totals, deltas, monthly, peakIncome } = data;
  const maxVal = Math.max(
    ...monthly.flatMap(m => [m.income, m.expense, m.invest])
  ) || 1;

  // Chart space used by SVG
  const chartW = 400;
  const chartH = 200;
  const groupW = chartW / 12; // equal space per month

  const barH = (v: number) => Math.max(8, Math.round((v / maxVal) * 180));

  return (
    <div ref={containerRef} className="relative w-[600px] h-[700px] bg-gray-900 dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5 mx-auto">
      {/* Gradient top */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none" />

      {/* Header (consistent) */}
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
              downloadElementPng(containerRef.current, `year-review-${year}-overview.png`, 600, 700);
            }
          }}
        >
          <Download className="text-white/70 group-hover:text-white h-5 w-5" />
        </button>
      </div>

      {/* Top metrics */}
      <div className="relative z-10 grid grid-cols-3 gap-4 px-6 mb-4">
        {/* Income */}
        <div className="flex flex-col bg-gray-800/50 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownCircle className="text-emerald-400 h-4 w-4" />
            </div>
            <span className="text-gray-400 text-xs font-semibold uppercase">Income</span>
          </div>
          <div className="text-white text-xl font-bold tracking-tight">{formatCurrency(totals.income)}</div>
          {deltas && (
            <div className="text-emerald-400 text-[11px] font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {deltas.income >= 0 ? '+' : ''}{deltas.income.toFixed(1)}%
            </div>
          )}
        </div>
        {/* Expenses */}
        <div className="flex flex-col bg-gray-800/50 border border-rose-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center">
              <ArrowUpCircle className="text-rose-400 h-4 w-4" />
            </div>
            <span className="text-gray-400 text-xs font-semibold uppercase">Expenses</span>
          </div>
          <div className="text-white text-xl font-bold tracking-tight">{formatCurrency(totals.expense)}</div>
          {deltas && (
            <div className="text-rose-400 text-[11px] font-medium mt-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> {deltas.expense >= 0 ? '+' : ''}{deltas.expense.toFixed(1)}%
            </div>
          )}
        </div>
        {/* Invested */}
        <div className="flex flex-col bg-gray-800/50 border border-violet-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="text-violet-400 h-4 w-4" />
            </div>
            <span className="text-gray-400 text-xs font-semibold uppercase">Invested</span>
          </div>
          <div className="text-white text-xl font-bold tracking-tight">{formatCurrency(totals.invest)}</div>
          {deltas && (
            <div className="text-violet-400 text-[11px] font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {deltas.invest >= 0 ? '+' : ''}{deltas.invest.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Annual Flow */}
      <div className="relative z-10 flex-1 px-6 pb-4 flex flex-col min-h-0">
        <div className="flex-1 bg-gradient-to-b from-gray-900 to-black/20 rounded-3xl border border-white/5 p-4 flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 z-20">
            <h2 className="text-white font-bold text-lg">Annual Flow</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-gray-400 text-[11px] font-medium">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                <span className="text-gray-400 text-[11px] font-medium">Expense</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
                <span className="text-gray-400 text-[11px] font-medium">Invest</span>
              </div>
            </div>
          </div>
          <div className="relative flex-1 w-full min-h-[200px]">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="w-full h-px bg-white border-t border-dashed border-white"></div>
              <div className="w-full h-px bg-white border-t border-dashed border-white"></div>
              <div className="w-full h-px bg-white border-t border-dashed border-white"></div>
              <div className="w-full h-px bg-white border-t border-dashed border-white"></div>
            </div>
            {/* Simple SVG bars aligned with month centers */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${chartW} ${chartH}`}>
              {monthly.map((m, idx) => {
                // center of this month's group within the chart
                const cx = groupW * (idx + 0.5);
                // total width of three bars (8px each + 1px gaps approximated by offsets)
                const groupBarsW = 26; // 8, 8, 8 with ~1px gaps → visually 26
                const xBase = cx - groupBarsW / 2;
                const hInc = barH(m.income);
                const hExp = barH(m.expense);
                const hInv = barH(m.invest);
                return (
                  <g key={idx}>
                    <rect fill="url(#gradInc)" height={hInc} rx={2} width={8} x={xBase} y={chartH - hInc} />
                    <rect fill="url(#gradExp)" height={hExp} rx={2} width={8} x={xBase + 9} y={chartH - hExp} />
                    <rect fill="url(#gradInv)" height={hInv} rx={2} width={8} x={xBase + 18} y={chartH - hInv} />
                  </g>
                );
              })}
              <defs>
                <linearGradient id="gradInc" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 0.6 }} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#F43F5E', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#F43F5E', stopOpacity: 0.6 }} />
                </linearGradient>
                <linearGradient id="gradInv" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 0.6 }} />
                </linearGradient>
              </defs>
            </svg>
            {peakIncome && (() => {
              const idx = peakIncome.monthIndex;
              const cx = groupW * (idx + 0.5);
              const hInc = barH(monthly[idx].income);
              const yTop = chartH - hInc; // top of the income bar
              const leftPct = (cx / chartW) * 100;
              const topPct = (yTop / chartH) * 100;
              return (
                <div
                  className="absolute -translate-x-1/2 -translate-y-2 bg-gray-900/95 border border-emerald-500/30 backdrop-blur-md px-3 py-2 rounded-lg shadow-xl"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-[10px] text-gray-300 uppercase font-bold tracking-wider">Peak Income</p>
                  </div>
                  <p className="text-sm font-bold text-white pl-3.5">{formatCurrency(peakIncome.amount)}</p>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-r border-b border-emerald-500/30 rotate-45"></div>
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-12 text-center text-[10px] text-gray-500 font-medium mt-2">
            {monthLabels.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        {/* Insight row */}
        <div className="mt-4 flex items-center justify-between px-2">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
              {/* lightbulb emoji */}
              <span className="text-yellow-400">💡</span>
            </div>
            <div>
              <h4 className="text-white text-sm font-bold">Smart Insight</h4>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed max-w-[280px]">
                You saved more than last year by reducing dining expenses in Q4.
              </p>
            </div>
          </div>
          <button className="text-blue-500 text-xs font-bold hover:text-white transition-colors">
            View Details
          </button>
        </div>
      </div>

      {/* Footer (consistent) */}
      <div className="relative z-10 text-center pb-6">
        <p className="text-gray-500 text-xs">Data collected from Jan 1, {year} to Dec 31, {year}</p>
      </div>
    </div>
  );
};

export default YearInReviewOverviewCard;
