import React, { useState } from 'react';
import { ChevronDown, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { Category } from '../../constants/categories';
import { RecurringSuggestion } from '../../services/recurringDetectionService';
import { formatCurrency } from '../../utils/formatters';

interface RecurringSuggestionsProps {
  suggestions: RecurringSuggestion[];
  categories: Category[];
  isScanning: boolean;
  onAdd: (suggestion: RecurringSuggestion) => Promise<void>;
  onDismiss: (suggestion: RecurringSuggestion) => void;
}

const ordinal = (n: number) => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
};

const shortDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  const date = y && m && d ? new Date(y, m - 1, d) : new Date(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const RecurringSuggestions: React.FC<RecurringSuggestionsProps> = ({
  suggestions,
  categories,
  isScanning,
  onAdd,
  onDismiss
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isScanning && suggestions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Looking for repeating payments in your transactions…
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  const handleAdd = async (suggestion: RecurringSuggestion) => {
    setAddingId(suggestion.id);
    setError(null);
    try {
      await onAdd(suggestion);
    } catch (err) {
      console.error('Failed to add recurring suggestion', err);
      setError(`Couldn't add ${suggestion.name}. Please try again.`);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section aria-labelledby="recurring-suggestions-heading" className="card">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="recurring-suggestions-heading" className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Detected from your transactions
            <span className="ml-2 text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{suggestions.length}</span>
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            These payments repeat every month. Add them to track due dates.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm mb-3" role="alert" style={{ color: 'var(--color-error)' }}>{error}</p>
      )}

      <ul className="divide-y" style={{ borderColor: 'var(--color-border-primary)' }}>
        {suggestions.map(suggestion => {
          const category = categories.find(c => c.id === suggestion.category);
          const isExpanded = expandedId === suggestion.id;
          const isAdding = addingId === suggestion.id;

          return (
            <li key={suggestion.id} className="py-3 first:pt-0 last:pb-0" style={{ borderColor: 'var(--color-border-primary)' }}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-expanded={isExpanded}
                  aria-controls={`suggestion-${suggestion.id}`}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    aria-hidden="true"
                  >
                    {category?.icon || '🔁'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {suggestion.name}
                    </span>
                    <span className="block text-xs truncate mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      Around the {ordinal(suggestion.dayOfMonth)} · {suggestion.monthsSeen} months
                      {category ? ` · ${category.name}` : ''}
                    </span>
                  </span>
                  <span className="text-right flex-shrink-0">
                    <span className="block font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                      {suggestion.amountVaries ? '~' : ''}{formatCurrency(suggestion.amount)}
                    </span>
                    {suggestion.amountVaries && (
                      <span className="block text-xs whitespace-nowrap mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        {formatCurrency(suggestion.minAmount)}–{formatCurrency(suggestion.maxAmount)}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`hidden sm:block w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-tertiary)' }}
                    aria-hidden="true"
                  />
                </button>

                {/* Desktop: actions inline with the row */}
                <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAdd(suggestion)}
                    disabled={addingId !== null}
                    className="btn-primary !px-3 !py-1.5 text-sm inline-flex items-center gap-1 disabled:opacity-60"
                    aria-label={`Add ${suggestion.name} as a monthly recurring payment`}
                  >
                    {isAdding
                      ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      : <Plus className="w-4 h-4" aria-hidden="true" />}
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(suggestion)}
                    disabled={isAdding}
                    className="p-2 rounded-full hover:opacity-70"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    title="Not recurring — hide this"
                    aria-label={`Dismiss ${suggestion.name}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Mobile: actions on their own line so the name keeps its width */}
              <div className="flex sm:hidden items-center gap-4 mt-2 ml-12">
                <button
                  type="button"
                  onClick={() => handleAdd(suggestion)}
                  disabled={addingId !== null}
                  className="btn-primary !px-3 !py-1.5 text-sm inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-60"
                  aria-label={`Add ${suggestion.name} as a monthly recurring payment`}
                >
                  {isAdding
                    ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    : <Plus className="w-4 h-4" aria-hidden="true" />}
                  Add to recurring
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(suggestion)}
                  disabled={isAdding}
                  className="text-sm font-medium hover:opacity-70"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label={`Dismiss ${suggestion.name}`}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                  className="ml-auto text-sm hover:opacity-70"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  aria-expanded={isExpanded}
                  aria-controls={`suggestion-${suggestion.id}`}
                >
                  {isExpanded ? 'Hide' : 'Details'}
                </button>
              </div>

              {isExpanded && (
                <div id={`suggestion-${suggestion.id}`} className="mt-3 ml-12 rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Next expected {shortDate(suggestion.nextDueDate)}. Matched payments:
                  </p>
                  <ul className="space-y-1.5">
                    {suggestion.transactions.slice(0, 12).map(t => (
                      <li key={t.id} className="flex items-baseline gap-3 text-xs">
                        <span className="w-14 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{shortDate(t.date)}</span>
                        <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-secondary)' }} title={t.description}>{t.description}</span>
                        <span className="font-medium tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RecurringSuggestions;
