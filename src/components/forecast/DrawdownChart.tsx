import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { LifeEvent } from '../../types';
import { formatLargeNumber } from '../../utils/formatters';

export interface SimulationDataPoint {
  age: number;
  year: number;
  isRetired: boolean;
  openingBalance: number;
  investment: number;
  expenses: number;
  returnRate: number;
  growth: number;
  closingBalance: number;
  hasActuals: boolean;
  eventInflows?: number;
  eventOutflows?: number;
  activeEventsInYear?: LifeEvent[];
}

interface DrawdownChartProps {
  data: SimulationDataPoint[];
  retirementAge: number;
  lifeEvents: LifeEvent[];
}

export const DrawdownChart: React.FC<DrawdownChartProps> = ({
  data,
  retirementAge,
  lifeEvents
}) => {
  const activeEvents = (lifeEvents || []).filter(e => e.isActive);

  // Custom Milestone Marker on the Area Curve
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.activeEventsInYear || payload.activeEventsInYear.length === 0) {
      return <g key={props.key || `empty-${props.index}`} />;
    }
    const hasIncome = payload.activeEventsInYear.some((e: any) => e.type.startsWith('income'));
    const hasExpense = payload.activeEventsInYear.some((e: any) => e.type.startsWith('expense'));
    const dotColor = hasIncome ? '#10B981' : hasExpense ? '#EF4444' : '#F59E0B';

    return (
      <g key={`milestone-dot-${payload.age}`}>
        {/* Halo indicator */}
        <circle cx={cx} cy={cy} r={11} fill={dotColor} fillOpacity={0.25} />
        {/* Ring */}
        <circle cx={cx} cy={cy} r={6.5} fill="#FFFFFF" stroke={dotColor} strokeWidth={2.5} />
        {/* Core */}
        <circle cx={cx} cy={cy} r={3} fill={dotColor} />
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: SimulationDataPoint = payload[0].payload;

    return (
      <div className="card p-3 shadow-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-xs space-y-2 min-w-[240px]">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
          <span className="font-bold text-gray-900 dark:text-white">
            Age {item.age} ({item.year})
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            item.isRetired 
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}>
            {item.isRetired ? '🏖️ Retirement' : '🌱 Accumulation'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
            <span>Portfolio Corpus:</span>
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {formatLargeNumber(item.closingBalance)}
            </span>
          </div>

          {!item.isRetired ? (
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
              <span>Annual SIP/Invested:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                +{formatLargeNumber(item.investment)}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
              <span>Living Expenses:</span>
              <span className="font-medium text-red-500 dark:text-red-400">
                -{formatLargeNumber(item.expenses)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
            <span>Annual Growth ({item.returnRate}%):</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              +{formatLargeNumber(item.growth)}
            </span>
          </div>
        </div>

        {/* Life events in this year */}
        {item.activeEventsInYear && item.activeEventsInYear.length > 0 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Active Milestones in Year {item.year}:
            </span>
            {item.activeEventsInYear.map((ev) => (
              <div key={ev.id} className="flex justify-between items-center text-[11px] p-1 rounded bg-gray-50 dark:bg-gray-800">
                <span className="truncate max-w-[140px] font-medium text-gray-900 dark:text-white">
                  {ev.name}
                </span>
                <span className={`font-bold ${
                  ev.type.startsWith('income') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {ev.type === 'income_pause' ? '⏸️ SIP Paused' : (
                    ev.type.startsWith('income') ? `+${formatLargeNumber(ev.amount)}` : `-${formatLargeNumber(ev.amount)}`
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Wealth Trajectory & Life Milestones
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Simulated portfolio corpus factoring in living expenses, market returns, and life event shocks.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-indigo-500/30 border border-indigo-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">Corpus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-500 border-t border-dashed border-amber-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">Retirement</span>
          </div>
        </div>
      </div>

      {/* Active Milestones Tag Bar */}
      {activeEvents.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mr-1">
            Timeline Pins:
          </span>
          {activeEvents.map(event => (
            <span
              key={event.id}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                event.type.startsWith('income')
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : event.type === 'income_pause'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              }`}
            >
              <span>{event.type.startsWith('income') ? '💰' : event.type === 'income_pause' ? '⏸️' : '🎯'}</span>
              <span>{event.name}</span>
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                (Age {event.targetAge})
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 25, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="corpusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="age" 
              tickFormatter={(age) => `Age ${age}`}
              stroke="#9CA3AF"
              fontSize={11}
            />
            <YAxis 
              tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
              stroke="#9CA3AF"
              fontSize={11}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area 
              type="monotone" 
              dataKey="closingBalance" 
              stroke="#6366F1" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#corpusGradient)" 
              dot={renderCustomDot as any}
            />

            {/* Retirement Age Reference Line */}
            <ReferenceLine 
              x={Number(retirementAge)} 
              stroke="#F59E0B" 
              strokeDasharray="4 4" 
              strokeWidth={2}
              isFront={true}
              label={{ 
                value: '🏖️ Retirement', 
                position: 'top', 
                fill: '#F59E0B', 
                fontSize: 11,
                fontWeight: 600
              }}
            />

            {/* Life Event Reference Lines rendered with isFront=true so they are always visible above the area */}
            {activeEvents.map((event) => {
              const targetAgeNum = Number(event.targetAge);
              const isIncome = event.type.startsWith('income');
              const isPause = event.type === 'income_pause';
              const color = isIncome ? '#10B981' : isPause ? '#F59E0B' : '#EF4444';
              const icon = isIncome ? '💰' : isPause ? '⏸️' : '🎯';

              return (
                <ReferenceLine
                  key={event.id}
                  x={targetAgeNum}
                  stroke={color}
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  isFront={true}
                  label={{
                    value: `${icon} ${event.name.length > 14 ? event.name.slice(0, 12) + '..' : event.name}`,
                    position: 'insideTopLeft',
                    fill: color,
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DrawdownChart;
