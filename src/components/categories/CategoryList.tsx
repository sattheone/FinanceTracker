import React, { useMemo, useState, useCallback } from 'react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { MonthlyBudget } from '../../types';
import { Category, getCategoryTransactionType } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';
import { Settings, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';

interface CategoryListProps {
    categories: Category[];
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string, section?: 'expense' | 'investment' | 'income') => void;
    spendingByCategory: Record<string, number>;
    investmentSpending?: Record<string, number>;
    incomeSpending?: Record<string, number>;
    transferSpending?: Record<string, number>;
    monthlyBudget: MonthlyBudget | null;
    viewMode?: 'month' | 'prevMonth' | 'year' | 'prevYear';
    includeTransfer?: boolean;
    includeInvestments?: boolean;
    includeIncome?: boolean;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    spendingByCategory,
    investmentSpending = {},
    incomeSpending = {},
    transferSpending = {},
    monthlyBudget,
    viewMode = 'month',
    includeTransfer = false,
    includeInvestments = false,
    includeIncome = false
}) => {
    const theme = useThemeClasses();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = useCallback((parentId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else next.add(parentId);
            return next;
        });
    }, []);

    // Pre-compute total spending per category across all transaction types
    const totalSpendingByCat = useMemo(() => {
        const map: Record<string, number> = {};
        categories.forEach(cat => {
            map[cat.id] =
                (spendingByCategory[cat.id] || 0) +
                (investmentSpending[cat.id] || 0) +
                (incomeSpending[cat.id] || 0) +
                (transferSpending[cat.id] || 0);
        });
        return map;
    }, [categories, spendingByCategory, investmentSpending, incomeSpending, transferSpending]);

    // Group categories by their mapped transactionType
    const groupedCategories = useMemo(() => {
        const active: Category[] = [];
        const investments: Category[] = [];
        const incomeList: Category[] = [];
        const hidden: Category[] = [];
        const system: Category[] = [];

        categories.forEach(cat => {
            const hasAnySpending = (totalSpendingByCat[cat.id] || 0) > 0;
            const isSystem = cat.isSystem || cat.id === 'transfer' || cat.id === 'adjustment';

            if (isSystem) {
                if (!includeTransfer && cat.id === 'transfer') return;
                system.push(cat);
                return;
            }

            const catType = getCategoryTransactionType(cat.id, categories);

            if (catType === 'income') {
                if (hasAnySpending) incomeList.push(cat);
            } else if (catType === 'investment') {
                if (hasAnySpending) investments.push(cat);
            } else {
                active.push(cat);
            }
        });

        const sortBySpend = (a: Category, b: Category) =>
            (totalSpendingByCat[b.id] || 0) - (totalSpendingByCat[a.id] || 0);
        active.sort(sortBySpend);
        investments.sort(sortBySpend);
        incomeList.sort(sortBySpend);

        return { active, investments, income: incomeList, hidden, system };
    }, [categories, totalSpendingByCat, includeTransfer]);

    // Build collapsible group entries for expenses
    type ExpenseEntry =
        | { type: 'group'; parent: Category; children: Category[]; total: number }
        | { type: 'standalone'; category: Category; total: number };

    const expenseEntries = useMemo((): ExpenseEntry[] => {
        const parents = categories.filter(c => !c.parentId && !c.isSystem && c.id !== 'transfer' && c.id !== 'adjustment');
        const activeIds = new Set(groupedCategories.active.map(c => c.id));
        const entries: ExpenseEntry[] = [];
        const accountedChildIds = new Set<string>();

        parents.forEach(parent => {
            const children = groupedCategories.active.filter(c => c.parentId === parent.id);
            children.forEach(c => accountedChildIds.add(c.id));

            if (children.length > 0) {
                const parentSpend = totalSpendingByCat[parent.id] || 0;
                const childrenSpend = children.reduce((sum, c) => sum + (totalSpendingByCat[c.id] || 0), 0);
                const total = parentSpend + childrenSpend;
                children.sort((a, b) => (totalSpendingByCat[b.id] || 0) - (totalSpendingByCat[a.id] || 0));
                entries.push({ type: 'group', parent, children, total });
            } else if (activeIds.has(parent.id)) {
                entries.push({ type: 'standalone', category: parent, total: totalSpendingByCat[parent.id] || 0 });
            }
        });

        // Add orphan children not accounted for by any parent
        groupedCategories.active.forEach(c => {
            if (c.parentId && !accountedChildIds.has(c.id)) {
                entries.push({ type: 'standalone', category: c, total: totalSpendingByCat[c.id] || 0 });
            }
        });

        entries.sort((a, b) => {
            const ta = a.type === 'group' ? a.total : a.total;
            const tb = b.type === 'group' ? b.total : b.total;
            return tb - ta;
        });

        return entries;
    }, [categories, groupedCategories.active, totalSpendingByCat]);

    // Helper to get total spending for a section
    const getSectionTotal = (list: Category[]) => {
        return list.reduce((sum, c) => sum + (totalSpendingByCat[c.id] || 0), 0);
    };

    // Render a single category item
    const renderCategoryItem = (category: Category, isInvestment = false, isIncome = false, indent = false) => {
        const section: 'expense' | 'investment' | 'income' = isIncome ? 'income' : isInvestment ? 'investment' : 'expense';
        const spent = totalSpendingByCat[category.id] || 0;

        const baseMonthlyBudget = !isInvestment
            ? (category.budget !== undefined
                ? category.budget
                : (monthlyBudget?.categoryBudgets?.[category.id] || 0))
            : 0;
        const monthsMultiplier = (viewMode === 'month' || viewMode === 'prevMonth') ? 1 : 12;
        const budgetAmount = baseMonthlyBudget * monthsMultiplier;
        const isSelected = selectedCategoryId === category.id;

        // Progress bar calculations
        const progress = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
        const isOverBudget = budgetAmount > 0 && spent > budgetAmount;

        const isSystemCategory = category.isSystem || category.id === 'transfer' || category.id === 'adjustment';

        return (
            <button
                key={category.id}
                onClick={() => onSelectCategory(category.id, section)}
                className={cn(
                    'w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors flex items-center justify-between group',
                    indent && 'pl-8',
                    isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
            >
                <div className="flex items-center min-w-0 flex-1">
                    <div
                        className="w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0"
                        style={{ backgroundColor: category.color || '#9CA3AF' }}
                    />
                    <span className="text-xl mr-2 flex-shrink-0">{category.icon}</span>
                    <div className="min-w-0 flex-1">
                        <p className={cn(
                            'text-sm font-medium truncate',
                            isSelected ? 'text-blue-900 dark:text-blue-100' : theme.textPrimary
                        )}>
                            {category.name}
                            {isSystemCategory && (
                                <Settings className="inline w-3 h-3 ml-1 text-gray-400 dark:text-gray-500" />
                            )}
                        </p>
                        {budgetAmount > 0 && (
                            <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full",
                                        isOverBudget ? "bg-red-500" : ""
                                    )}
                                    style={{ width: `${progress}%`, backgroundColor: isOverBudget ? undefined : (category.color || '#3B82F6') }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right ml-4">
                    <p className={cn(
                        "text-sm font-medium",
                        isSelected ? 'text-blue-900 dark:text-blue-100' : theme.textPrimary
                    )}>
                        {formatCurrency(spent)}
                    </p>
                    {budgetAmount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            of {formatCurrency(budgetAmount)}
                        </p>
                    )}
                </div>
            </button>
        );
    };

    // Render a collapsible group header
    const renderGroup = (parent: Category, children: Category[], total: number, section: 'expense' | 'investment' | 'income' = 'expense') => {
        const isExpanded = expandedGroups.has(parent.id);
        const isSelected = selectedCategoryId === parent.id;

        return (
            <div key={parent.id} className="mb-2">
                <div
                    onClick={() => onSelectCategory(parent.id, section)}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] group/header',
                        isSelected
                            ? 'bg-[color:var(--color-accent-light)] border-[color:var(--color-accent-primary)]/40 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/75 dark:hover:bg-slate-800/65 hover:border-[color:var(--color-accent-primary)]/30 hover:ring-1 hover:ring-[color:var(--color-accent-primary)]/5'
                    )}
                >
                    <div className="flex items-center min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleGroup(parent.id); }}
                            className="p-1 mr-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex-shrink-0 transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-hover/header:scale-110" />
                            ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-hover/header:scale-110" />
                            )}
                        </button>
                        <span className="text-lg mr-2.5 flex-shrink-0 filter drop-shadow-sm transition-transform duration-200 group-hover/header:scale-110">{parent.icon}</span>
                        <p className={cn(
                            'text-xs font-bold uppercase tracking-widest truncate',
                            isSelected ? 'text-[color:var(--color-accent-primary)]' : 'text-slate-700 dark:text-slate-350'
                        )}>
                            {parent.name}
                        </p>
                        <span className="ml-2 text-[9px] bg-slate-200/50 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 leading-none">
                            {children.length}
                        </span>
                    </div>
                    <span className={cn(
                        'text-xs font-bold ml-2 tracking-tight',
                        isSelected ? 'text-[color:var(--color-accent-primary)]' : 'text-slate-800 dark:text-slate-200'
                    )}>
                        {formatCurrency(total)}
                    </span>
                </div>
                {isExpanded && (
                    <div className="mt-1 pl-1 space-y-1">
                        {(totalSpendingByCat[parent.id] || 0) > 0 && (
                            renderCategoryItem(
                                { ...parent, name: `${parent.name} (Direct)` },
                                section === 'investment',
                                section === 'income',
                                true
                            )
                        )}
                        {children.map(child =>
                            renderCategoryItem(child, section === 'investment', section === 'income', true)
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Main render
    return (
        <div className={cn('p-2', theme.bgPrimary)}>
            <div className="space-y-4">
                {includeInvestments && groupedCategories.investments.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                Investments
                            </h3>
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                {formatCurrency(getSectionTotal(groupedCategories.investments))}
                            </span>
                        </div>
                        {groupedCategories.investments.map(c => renderCategoryItem(c, true))}
                    </section>
                )}

                {includeIncome && groupedCategories.income.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                                Income
                            </h3>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(getSectionTotal(groupedCategories.income))}
                            </span>
                        </div>
                        {groupedCategories.income.map(c => renderCategoryItem(c, false, true))}
                    </section>
                )}

                {/* Expenses with Collapsible Groups */}
                <section>
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Expenses
                        </h3>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Total: {formatCurrency(getSectionTotal(groupedCategories.active))}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {expenseEntries.map(entry => {
                            if (entry.type === 'group') {
                                return renderGroup(entry.parent, entry.children, entry.total);
                            }
                            return renderCategoryItem(entry.category, false);
                        })}
                    </div>
                </section>

                {/* System Categories */}
                {groupedCategories.system.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Settings className="w-3 h-3" /> System
                            </h3>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {formatCurrency(getSectionTotal(groupedCategories.system))}
                            </span>
                        </div>
                        {groupedCategories.system.map(c => renderCategoryItem(c, false))}
                    </section>
                )}

                {/* Hidden Categories */}
                {groupedCategories.hidden.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> Hidden
                            </h3>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {formatCurrency(getSectionTotal(groupedCategories.hidden))}
                            </span>
                        </div>
                        {groupedCategories.hidden.map(c => renderCategoryItem(c, false))}
                    </section>
                )}
            </div>
        </div>
    );
};

export default CategoryList;
