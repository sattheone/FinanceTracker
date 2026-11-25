import React from 'react';
import { LifeEvent, Goal } from '../../types';
import { formatLargeNumber } from '../../utils/formatters';
import { 
  Plus, 
  Sparkles, 
  GraduationCap, 
  Home, 
  Car, 
  Heart, 
  Palmtree, 
  TrendingUp, 
  Building2, 
  Calendar,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2
} from 'lucide-react';

interface TimelineMilestonesRibbonProps {
  lifeEvents: LifeEvent[];
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflationRate: number;
  goals?: Goal[];
  onAddEvent: () => void;
  onEditEvent: (event: LifeEvent) => void;
  onDeleteEvent: (id: string) => void;
  onToggleActive: (id: string) => void;
  onImportGoals: () => void;
}

const getEventIcon = (category: LifeEvent['category'], type: LifeEvent['type']) => {
  if (type === 'income_pause') return Palmtree;
  switch (category) {
    case 'education': return GraduationCap;
    case 'housing': return Home;
    case 'family': return Heart;
    case 'vehicle': return Car;
    case 'career': return Palmtree;
    case 'windfall': return TrendingUp;
    default: return Building2;
  }
};

const getEventColorClasses = (type: LifeEvent['type'], isActive: boolean) => {
  if (!isActive) {
    return {
      badge: 'bg-gray-100 text-gray-400 border-gray-300 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 opacity-60',
      tag: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
      accent: 'text-gray-400'
    };
  }

  switch (type) {
    case 'income_once':
    case 'income_recurring':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        tag: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
        accent: 'text-emerald-600 dark:text-emerald-400'
      };
    case 'income_pause':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        tag: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
        accent: 'text-amber-600 dark:text-amber-400'
      };
    default: // expenses
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        tag: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
        accent: 'text-blue-600 dark:text-blue-400'
      };
  }
};

export const TimelineMilestonesRibbon: React.FC<TimelineMilestonesRibbonProps> = ({
  lifeEvents,
  currentAge,
  retirementAge,
  lifeExpectancy,
  inflationRate,
  goals = [],
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onToggleActive,
  onImportGoals
}) => {
  const currentYear = new Date().getFullYear();
  const sortedEvents = [...lifeEvents].sort((a, b) => a.targetAge - b.targetAge);
  const activeCount = sortedEvents.filter(e => e.isActive).length;

  // Calculate unimported goals count
  const unimportedGoals = goals.filter(
    g => !lifeEvents.some(e => e.linkedGoalId === g.id)
  );

  return (
    <div className="card p-5 space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Life Events & Milestones Timeline
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Map discrete life milestones (college, house purchase, sabbatical, windfalls) onto your projection runway.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {unimportedGoals.length > 0 && (
            <button
              type="button"
              onClick={onImportGoals}
              className="text-xs px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5 transition-colors"
              title="Import goals from the Goals tracker into your timeline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sync {unimportedGoals.length} Goal{unimportedGoals.length > 1 ? 's' : ''}
            </button>
          )}

          <button
            type="button"
            onClick={onAddEvent}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Milestone
          </button>
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative pt-6 pb-4">
        {/* Track Line */}
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
          {/* Accumulation vs Decumulation split shading */}
          <div 
            className="h-full bg-indigo-500/20 dark:bg-indigo-400/20"
            style={{ 
              width: `${Math.min(100, Math.max(0, ((retirementAge - currentAge) / (lifeExpectancy - currentAge)) * 100))}%` 
            }}
          />
        </div>

        {/* Milestone Pins along the timeline */}
        <div className="relative w-full h-8 mt-1">
          {/* Current Age Pin */}
          <div 
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: '0%' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-100 dark:ring-blue-950" />
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mt-1 whitespace-nowrap">
              Now ({currentAge})
            </span>
          </div>

          {/* Retirement Age Pin */}
          <div 
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ 
              left: `${Math.min(95, Math.max(5, ((retirementAge - currentAge) / (lifeExpectancy - currentAge)) * 100))}%` 
            }}
          >
            <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950" />
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 whitespace-nowrap">
              🏖️ Retire ({retirementAge})
            </span>
          </div>

          {/* Horizon Pin */}
          <div 
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: '100%' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600" />
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">
              Age {lifeExpectancy}
            </span>
          </div>

          {/* Event Pins on track */}
          {sortedEvents.map((event) => {
            const pct = Math.min(98, Math.max(2, ((event.targetAge - currentAge) / (lifeExpectancy - currentAge)) * 100));
            const Icon = getEventIcon(event.category, event.type);
            const colors = getEventColorClasses(event.type, event.isActive);

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onEditEvent(event)}
                className={`absolute -top-3 -translate-x-1/2 p-1.5 rounded-full shadow-md border transition-transform hover:scale-125 z-10 ${colors.badge}`}
                style={{ left: `${pct}%` }}
                title={`${event.name} (Age ${event.targetAge}) - Click to edit`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Cards / Chips Grid */}
      {sortedEvents.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No life events or milestones modeled yet.
          </p>
          <button
            type="button"
            onClick={onAddEvent}
            className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add your first milestone (e.g. Kid's College, House, Sabbatical)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {sortedEvents.map((event) => {
            const Icon = getEventIcon(event.category, event.type);
            const colors = getEventColorClasses(event.type, event.isActive);
            const yearsUntil = Math.max(0, event.targetAge - currentAge);
            const eventYear = currentYear + yearsUntil;
            const inflatedAmount = event.isInflationAdjusted 
              ? Math.round(event.amount * Math.pow(1 + inflationRate / 100, yearsUntil))
              : event.amount;

            return (
              <div
                key={event.id}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${colors.badge}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${colors.tag} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${event.isActive ? 'text-gray-900 dark:text-white' : 'line-through text-gray-400 dark:text-gray-500'}`}>
                          {event.name}
                        </h4>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          Age {event.targetAge} • Yr {eventYear}
                          {event.durationYears > 1 && ` • ${event.durationYears} yrs`}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={() => onToggleActive(event.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      title={event.isActive ? 'Turn off (test what-if without this event)' : 'Activate milestone'}
                    >
                      {event.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Impact Amount */}
                  <div className="mt-2 flex items-baseline justify-between text-xs">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {event.type === 'income_pause' ? 'SIP Paused' : event.type.includes('recurring') ? 'Per Year:' : 'Total:'}
                    </span>
                    <span className={`font-bold ${colors.accent}`}>
                      {event.type === 'income_pause' 
                        ? `${event.durationYears} Year${event.durationYears > 1 ? 's' : ''}` 
                        : event.type.startsWith('income')
                          ? `+${formatLargeNumber(inflatedAmount)}`
                          : `-${formatLargeNumber(inflatedAmount)}`
                      }
                      {event.isInflationAdjusted && event.type !== 'income_pause' && (
                        <span className="text-[10px] font-normal text-gray-400 ml-1">
                          (incl. {inflationRate}% inf)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-400 capitalize">
                    {event.type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditEvent(event)}
                      className="p-1 rounded hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                      title="Edit milestone"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(event.id)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-gray-400 hover:text-red-600"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimelineMilestonesRibbon;
