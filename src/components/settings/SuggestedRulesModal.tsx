import React from 'react';
import { Sparkles, Plus, Edit3, X } from 'lucide-react';
import Modal from '../common/Modal';
import { useData } from '../../contexts/DataContext';
import { Transaction, CategoryRule } from '../../types';
import RuleCreationDialog from '../transactions/RuleCreationDialog';
import AutoCategorizationService from '../../services/autoCategorization';
import CategoryPopover from '../transactions/CategoryPopover';
import InlineTypeEditor from '../transactions/InlineTypeEditor';

interface SuggestedRuleItem {
  keyword: string;
  count: number;
  suggestedCategoryId: string;
  transactionType: 'expense' | 'income' | 'investment' | 'insurance' | 'transfer' | 'unchanged';
  matchType: 'partial' | 'exact';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Local keyword → category mapping derived from default heuristics
const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  // Food & Dining
  restaurant: 'food', food: 'food', cafe: 'food', pizza: 'food', burger: 'food', swiggy: 'food', zomato: 'food', 'uber eats': 'food', dominos: 'food', mcdonalds: 'food', kfc: 'food', subway: 'food', starbucks: 'food',
  // Transportation
  uber: 'transport', ola: 'transport', taxi: 'transport', metro: 'transport', bus: 'transport', petrol: 'transport', diesel: 'transport', fuel: 'transport', parking: 'transport', toll: 'transport', rapido: 'transport',
  // Shopping
  amazon: 'shopping', flipkart: 'shopping', myntra: 'shopping', ajio: 'shopping', shopping: 'shopping', mall: 'shopping', store: 'shopping', purchase: 'shopping', buy: 'shopping',
  // Entertainment
  movie: 'entertainment', cinema: 'entertainment', netflix: 'entertainment', spotify: 'entertainment', youtube: 'entertainment', game: 'entertainment', entertainment: 'entertainment', bookmyshow: 'entertainment', pvr: 'entertainment',
  // Bills & Utilities
  electricity: 'bills', water: 'bills', gas: 'bills', internet: 'bills', mobile: 'bills', phone: 'bills', bill: 'bills', recharge: 'bills', jio: 'bills', airtel: 'bills', vi: 'bills', bsnl: 'bills',
  // Healthcare
  hospital: 'healthcare', doctor: 'healthcare', medical: 'healthcare', pharmacy: 'healthcare', medicine: 'healthcare', health: 'healthcare', clinic: 'healthcare', apollo: 'healthcare', max: 'healthcare',
  // Education
  school: 'education', college: 'education', university: 'education', course: 'education', book: 'education', education: 'education', tuition: 'education', fees: 'education',
  // Travel
  flight: 'travel', hotel: 'travel', booking: 'travel', travel: 'travel', trip: 'travel', vacation: 'travel', makemytrip: 'travel', goibibo: 'travel', cleartrip: 'travel',
  // Income
  salary: 'salary', wage: 'income', pay: 'income', income: 'income', bonus: 'income', incentive: 'income',
  // Investment
  'mutual fund': 'investment', sip: 'investment', stock: 'investment', share: 'investment', investment: 'investment', zerodha: 'investment', groww: 'investment', upstox: 'investment'
};

const sixMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d;
};

const SuggestedRulesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { transactions, categories, addCategoryRule, updateCategoryRule } = useData();
  const [suggestions, setSuggestions] = React.useState<SuggestedRuleItem[]>([]);
  const [editingRule, setEditingRule] = React.useState<CategoryRule | null>(null);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = React.useState(false);
  const [categoryPopoverAnchor, setCategoryPopoverAnchor] = React.useState<HTMLElement | null>(null);
  const [categoryPopoverKeyword, setCategoryPopoverKeyword] = React.useState<string | null>(null);

  // Ensure only leaf categories are selected; if a group is provided, pick its first child
  const toLeafCategoryId = React.useCallback((categoryId: string): string => {
    if (!categories || categories.length === 0) return categoryId;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return categoryId;
    const children = categories
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0));
    return children.length > 0 ? children[0].id : categoryId;
  }, [categories]);

  React.useEffect(() => {
    if (!isOpen) return;
    const start = sixMonthsAgo();
    const recent = transactions.filter(t => new Date(t.date) >= start);

    const counts: Record<string, number> = {};

    // Count matched keywords from default rules per transaction
    recent.forEach((t: Transaction) => {
      const kws = AutoCategorizationService.getMatchingKeywords(t.description);
      kws.forEach(k => {
        const key = k.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      });
    });

    // Build suggestions list sorted by count desc
    let items: SuggestedRuleItem[] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([keyword, count]) => ({
        keyword,
        count,
        suggestedCategoryId: KEYWORD_CATEGORY_MAP[keyword] || 'other',
        transactionType: 'unchanged',
        matchType: 'partial'
      }));

    // Convert any group IDs to leaf category IDs
    items = items.map(item => ({
      ...item,
      suggestedCategoryId: toLeafCategoryId(item.suggestedCategoryId)
    }));

    setSuggestions(items);
  }, [isOpen, transactions]);

  const handleCreate = (s: SuggestedRuleItem) => {
    const rule: Omit<CategoryRule, 'id'> = {
      name: s.keyword,
      categoryId: s.suggestedCategoryId,
      matchType: s.matchType,
      isActive: true,
      matchCount: 0,
      createdAt: new Date().toISOString()
    } as any;
    if (s.transactionType !== 'unchanged') {
      (rule as any).transactionType = s.transactionType;
    }
    addCategoryRule(rule);
  };

  const handleEditBeforeCreate = (s: SuggestedRuleItem) => {
    // Open the RuleCreationDialog with pre-filled rule
    const tempRule: CategoryRule = {
      id: 'temp',
      name: s.keyword,
      categoryId: s.suggestedCategoryId,
      matchType: s.matchType,
      isActive: true,
      matchCount: s.count,
      transactionType: s.transactionType === 'unchanged' ? undefined : s.transactionType,
      createdAt: new Date().toISOString()
    } as any;
    setEditingRule(tempRule);
  };

  const handleDismiss = (keyword: string) => {
    setSuggestions(prev => prev.filter(s => s.keyword !== keyword));
  };

  // header controls omitted; using modal title and content actions instead

  const handleAutoAllowAll = () => {
    if (!suggestions.length) return;
    const proceed = window.confirm('Automatically create rules for all suggestions?');
    if (!proceed) return;
    suggestions.forEach(s => handleCreate(s));
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Suggested Rules"
        size="xl"
        footer={(
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-[#9dabb8]">Create rules for all shown suggestions</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#3c4753] text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#293038] transition-colors">Close</button>
              <button onClick={handleAutoAllowAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors">
                <Sparkles className="w-4 h-4" />
                Create All
              </button>
            </div>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-[#9dabb8]">
            We found {suggestions.length} recurring transaction patterns in the last 6 months. Review and create rules to automate your categorization.
          </p>

          <div className="space-y-3">
            {suggestions.map((s) => (
              <div
                key={s.keyword}
                className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-[#293038] bg-white dark:bg-[#111418] p-4 shadow-sm transition-all hover:shadow-md xl:flex-row xl:items-center xl:justify-between cursor-pointer"
                onClick={() => {
                  const tempRule: CategoryRule = {
                    id: 'temp',
                    name: s.keyword,
                    categoryId: s.suggestedCategoryId,
                    matchType: s.matchType,
                    isActive: true,
                    matchCount: s.count,
                    transactionType: s.transactionType,
                    createdAt: new Date().toISOString()
                  } as any;
                  setEditingRule(tempRule);
                }}
              >
                {/* Left: Selected category icon + stats */}
                <div className="flex items-center gap-4 min-w-[220px]">
                  {(() => {
                    const selectedCategory = categories.find(c => c.id === s.suggestedCategoryId);
                    return (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#293038]" style={{ border: `1px solid ${selectedCategory?.color || '#e5e7eb'}` }}>
                        <span className="text-xl" style={{ color: selectedCategory?.color || undefined }}>{selectedCategory?.icon || '🔎'}</span>
                      </div>
                    );
                  })()}
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">{s.keyword.toUpperCase()}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-[#9dabb8]">{s.count} matches • 6 mos</p>
                  </div>
                </div>

                {/* Middle: Controls */}
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCategoryPopoverAnchor(e.currentTarget as HTMLElement); setCategoryPopoverKeyword(s.keyword); setCategoryPopoverOpen(true); }}
                      className="flex items-center justify-between h-9 w-full rounded-lg border border-slate-200 dark:border-[#3c4753] bg-slate-50 dark:bg-[#111418] text-sm font-semibold px-3 hover:border-primary focus:border-primary transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">
                          {(categories.find(c => c.id === s.suggestedCategoryId)?.icon) || '📋'}
                        </span>
                        <span className="text-slate-700 dark:text-white">
                          {categories.find(c => c.id === s.suggestedCategoryId)?.name || 'Select Category'}
                        </span>
                      </span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Match Type</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSuggestions(prev => prev.map(x => x.keyword === s.keyword ? { ...x, matchType: 'partial' } : x));
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${s.matchType === 'partial'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-[#3c4753] bg-slate-50 dark:bg-[#111418] text-slate-700 dark:text-white hover:border-primary'
                          }`}
                      >
                        Partial
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSuggestions(prev => prev.map(x => x.keyword === s.keyword ? { ...x, matchType: 'exact' } : x));
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${s.matchType === 'exact'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-[#3c4753] bg-slate-50 dark:bg-[#111418] text-slate-700 dark:text-white hover:border-primary'
                          }`}
                      >
                        Exact
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</label>
                    <InlineTypeEditor
                      currentType={s.transactionType}
                      onSave={(type) => setSuggestions(prev => prev.map(x => x.keyword === s.keyword ? { ...x, transactionType: type } : x))}
                      allowUnchanged
                      triggerClassName="flex items-center justify-between h-9 w-full rounded-lg border border-slate-200 dark:border-[#3c4753] bg-slate-50 dark:bg-[#111418] text-sm font-semibold px-3 hover:border-primary focus:border-primary transition-colors"
                      triggerContent={(
                        <span className="flex items-center gap-2 w-full">
                          <span className="text-base">
                            {s.transactionType === 'unchanged' ? '⏸️' : s.transactionType === 'income' ? '💰' : s.transactionType === 'expense' ? '💸' : s.transactionType === 'investment' ? '📊' : '🛡️'}
                          </span>
                          <span className="text-slate-700 dark:text-white flex-1">
                            {s.transactionType === 'unchanged' ? 'Unchanged' : s.transactionType.charAt(0).toUpperCase() + s.transactionType.slice(1)}
                          </span>
                        </span>
                      )}
                    />
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-end justify-end gap-2 pt-2 xl:pt-0 xl:h-full xl:pl-4 xl:border-l xl:border-slate-100 xl:dark:border-[#293038]">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDismiss(s.keyword); }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-[#3c4753] text-slate-500 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#293038] transition-colors"
                    aria-label="Dismiss"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditBeforeCreate(s); }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-[#3c4753] text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#293038] transition-colors"
                    aria-label="Edit before create"
                    title="Edit before create"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleCreate(s); }} className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                    Create Rule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {categoryPopoverOpen && (
        <CategoryPopover
          isOpen={categoryPopoverOpen}
          onClose={() => setCategoryPopoverOpen(false)}
          anchorElement={categoryPopoverAnchor}
          currentCategory={suggestions.find(x => x.keyword === categoryPopoverKeyword)?.suggestedCategoryId}
          onSelect={(categoryId) => {
            setSuggestions(prev => prev.map(x => x.keyword === categoryPopoverKeyword ? { ...x, suggestedCategoryId: categoryId } : x));
            setCategoryPopoverOpen(false);
          }}
        />
      )}

      {editingRule && (
        <RuleCreationDialog
          isOpen={true}
          onClose={() => setEditingRule(null)}
          transaction={{ id: 'suggested', description: editingRule.name, amount: 0, date: new Date().toISOString(), category: '', type: 'expense', bankAccountId: '', tags: [] }}
          initialRule={editingRule}
          transactions={transactions}
          categories={categories}
          onCreateRule={(rule) => { addCategoryRule(rule); setEditingRule(null); }}
          onEditRule={(updatedRule) => { updateCategoryRule(updatedRule.id, updatedRule); setEditingRule(null); }}
        />
      )}
    </>
  );
};

export default SuggestedRulesModal;
