import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { LifeEvent, LifeEventType, LifeEventCategory, Goal } from '../../types';
import { formatCurrency, formatLargeNumber } from '../../utils/formatters';
import { 
  GraduationCap, 
  Home, 
  Car, 
  Heart, 
  Palmtree, 
  TrendingUp, 
  Building2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface LifeEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: LifeEvent | null;
  onSave: (event: Omit<LifeEvent, 'id'>) => void;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflationRate: number;
  goals?: Goal[];
}

interface PresetTemplate {
  name: string;
  type: LifeEventType;
  category: LifeEventCategory;
  amount: number;
  durationYears: number;
  isInflationAdjusted: boolean;
  icon: React.ComponentType<{ className?: string }>;
  suggestedOffsetAge: number; // added to currentAge
}

const PRESETS: PresetTemplate[] = [
  {
    name: "Child's Higher Education",
    type: 'expense_recurring',
    category: 'education',
    amount: 800000,
    durationYears: 4,
    isInflationAdjusted: true,
    icon: GraduationCap,
    suggestedOffsetAge: 12,
  },
  {
    name: 'Dream Home Downpayment',
    type: 'expense_once',
    category: 'housing',
    amount: 3500000,
    durationYears: 1,
    isInflationAdjusted: true,
    icon: Home,
    suggestedOffsetAge: 5,
  },
  {
    name: 'Vehicle Upgrade',
    type: 'expense_once',
    category: 'vehicle',
    amount: 1500000,
    durationYears: 1,
    isInflationAdjusted: true,
    icon: Car,
    suggestedOffsetAge: 3,
  },
  {
    name: 'Wedding / Family Milestone',
    type: 'expense_once',
    category: 'family',
    amount: 2000000,
    durationYears: 1,
    isInflationAdjusted: true,
    icon: Heart,
    suggestedOffsetAge: 8,
  },
  {
    name: 'Career Sabbatical / Break',
    type: 'income_pause',
    category: 'career',
    amount: 0,
    durationYears: 1,
    isInflationAdjusted: false,
    icon: Palmtree,
    suggestedOffsetAge: 7,
  },
  {
    name: 'Property / Asset Sale Windfall',
    type: 'income_once',
    category: 'windfall',
    amount: 4000000,
    durationYears: 1,
    isInflationAdjusted: false,
    icon: TrendingUp,
    suggestedOffsetAge: 10,
  },
  {
    name: 'Rental / Secondary Inflow',
    type: 'income_recurring',
    category: 'housing',
    amount: 300000,
    durationYears: 15,
    isInflationAdjusted: true,
    icon: Building2,
    suggestedOffsetAge: 15,
  }
];

export const LifeEventModal: React.FC<LifeEventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onSave,
  currentAge,
  retirementAge,
  lifeExpectancy,
  inflationRate,
  goals = []
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<LifeEventType>('expense_once');
  const [category, setCategory] = useState<LifeEventCategory>('other');
  const [targetAge, setTargetAge] = useState(currentAge + 5);
  const [durationYears, setDurationYears] = useState(1);
  const [amount, setAmount] = useState<number>(1000000);
  const [isInflationAdjusted, setIsInflationAdjusted] = useState(true);
  const [notes, setNotes] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState<string | undefined>(undefined);

  // Sync state when modal opens or eventToEdit changes
  useEffect(() => {
    if (eventToEdit) {
      setName(eventToEdit.name);
      setType(eventToEdit.type);
      setCategory(eventToEdit.category);
      setTargetAge(eventToEdit.targetAge);
      setDurationYears(eventToEdit.durationYears || 1);
      setAmount(eventToEdit.amount || 0);
      setIsInflationAdjusted(eventToEdit.isInflationAdjusted ?? true);
      setNotes(eventToEdit.notes || '');
      setLinkedGoalId(eventToEdit.linkedGoalId);
    } else {
      setName('');
      setType('expense_once');
      setCategory('other');
      setTargetAge(Math.min(currentAge + 5, retirementAge));
      setDurationYears(1);
      setAmount(1000000);
      setIsInflationAdjusted(true);
      setNotes('');
      setLinkedGoalId(undefined);
    }
  }, [eventToEdit, isOpen, currentAge, retirementAge]);

  const applyPreset = (preset: PresetTemplate) => {
    setName(preset.name);
    setType(preset.type);
    setCategory(preset.category);
    setAmount(preset.amount);
    setDurationYears(preset.durationYears);
    setIsInflationAdjusted(preset.isInflationAdjusted);
    setTargetAge(Math.min(currentAge + preset.suggestedOffsetAge, lifeExpectancy));
  };

  const handleGoalSelect = (goalId: string) => {
    if (!goalId) {
      setLinkedGoalId(undefined);
      return;
    }
    const selected = goals.find(g => g.id === goalId);
    if (!selected) return;

    setName(selected.name);
    setType('expense_once');
    setAmount(selected.targetAmount);
    setIsInflationAdjusted(selected.isInflationAdjusted ?? true);
    setLinkedGoalId(selected.id);

    // Estimate target age from target date
    const targetYear = new Date(selected.targetDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const calculatedAge = currentAge + Math.max(0, targetYear - currentYear);
    setTargetAge(Math.min(calculatedAge, lifeExpectancy));

    if (selected.category === 'education') setCategory('education');
    else if (selected.category === 'house') setCategory('housing');
    else if (selected.category === 'marriage') setCategory('family');
    else if (selected.category === 'vacation') setCategory('travel');
    else setCategory('other');
  };

  const yearsUntilEvent = Math.max(0, targetAge - currentAge);
  const futureAnnualAmount = isInflationAdjusted 
    ? Math.round(amount * Math.pow(1 + inflationRate / 100, yearsUntilEvent))
    : amount;

  const totalEventCost = type === 'expense_recurring' || type === 'income_recurring'
    ? futureAnnualAmount * durationYears
    : futureAnnualAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type,
      category,
      targetAge: Number(targetAge),
      durationYears: type === 'expense_recurring' || type === 'income_recurring' || type === 'income_pause' 
        ? Math.max(1, Number(durationYears)) 
        : 1,
      amount: type === 'income_pause' ? 0 : Number(amount),
      isInflationAdjusted,
      isActive: eventToEdit ? eventToEdit.isActive : true,
      linkedGoalId,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? 'Edit Life Event / Milestone' : 'Add Life Event / Milestone'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
          >
            {eventToEdit ? 'Update Event' : 'Add Event to Timeline'}
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
        {/* Quick Presets (only when creating new) */}
        {!eventToEdit && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Templates
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-center text-center p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-xs group"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1.5 transition-colors">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Import from Goals */}
        {goals.length > 0 && !eventToEdit && (
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                Link from your existing Goals:
              </label>
              {linkedGoalId && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-medium">
                  Goal Linked
                </span>
              )}
            </div>
            <select
              value={linkedGoalId || ''}
              onChange={(e) => handleGoalSelect(e.target.value)}
              className="w-full text-xs input-field bg-white dark:bg-gray-800"
            >
              <option value="">-- Choose a Goal or enter manually below --</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} ({formatLargeNumber(g.targetAmount)} by {new Date(g.targetDate).getFullYear()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kid's College, Buy Apartment"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LifeEventCategory)}
                className="input-field"
              >
                <option value="education">🎓 Education</option>
                <option value="housing">🏡 Housing / Real Estate</option>
                <option value="family">💍 Family & Marriage</option>
                <option value="vehicle">🚗 Vehicle / Auto</option>
                <option value="travel">✈️ Travel & Vacation</option>
                <option value="career">💼 Career / Sabbatical</option>
                <option value="windfall">💰 Windfall / Inheritance</option>
                <option value="health">🏥 Health & Medical</option>
                <option value="other">📌 Other Milestone</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LifeEventType)}
                className="input-field"
              >
                <option value="expense_once">One-Time Expense</option>
                <option value="expense_recurring">Recurring Expense (N Yrs)</option>
                <option value="income_once">One-Time Inflow / Windfall</option>
                <option value="income_recurring">Recurring Extra Income</option>
                <option value="income_pause">Sabbatical (Pause SIP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Target Age
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={currentAge}
                  max={lifeExpectancy}
                  value={targetAge}
                  onChange={(e) => setTargetAge(Number(e.target.value))}
                  className="input-field"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                  Yr {new Date().getFullYear() + (targetAge - currentAge)}
                </span>
              </div>
            </div>

            {(type === 'expense_recurring' || type === 'income_recurring' || type === 'income_pause') && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Duration (Years)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={durationYears}
                  onChange={(e) => setDurationYears(Number(e.target.value))}
                  className="input-field"
                />
              </div>
            )}
          </div>

          {type !== 'income_pause' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {type === 'expense_recurring' || type === 'income_recurring' ? 'Annual Amount (₹)' : 'Total Amount (₹)'}
                </label>
                <span className="text-xs font-medium text-gray-500">
                  {formatLargeNumber(amount)}
                </span>
              </div>
              <input
                type="number"
                min={0}
                step={50000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input-field text-base font-semibold"
              />
            </div>
          )}

          {/* Inflation preview card */}
          {type !== 'income_pause' && (
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInflationAdjusted}
                    onChange={(e) => setIsInflationAdjusted(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Adjust for Inflation ({inflationRate}% p.a.)</span>
                </label>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isInflationAdjusted ? `${formatCurrency(futureAnnualAmount)} / yr` : `${formatCurrency(amount)}`}
                </span>
              </div>

              {isInflationAdjusted && yearsUntilEvent > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                  <span>
                    In {yearsUntilEvent} years (Age {targetAge}), ₹{formatLargeNumber(amount)} today will cost approximately{' '}
                    <strong className="text-gray-900 dark:text-white">{formatLargeNumber(futureAnnualAmount)}</strong> due to {inflationRate}% inflation.
                    {(type === 'expense_recurring' || type === 'income_recurring') && durationYears > 1 && (
                      <span> Total over {durationYears} years: <strong className="text-gray-900 dark:text-white">{formatLargeNumber(totalEventCost)}</strong>.</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add assumptions or details..."
              className="input-field text-xs"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default LifeEventModal;
