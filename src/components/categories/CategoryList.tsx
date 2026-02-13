import React, { useMemo } from 'react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { MonthlyBudget } from '../../types';
import { Category } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';
import { Settings, EyeOff, ChevronRight } from 'lucide-react';

interface CategoryListProps {
    categories: Category[];
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string) => void;
    spendingByCategory: Record<string, number>;
    investmentSpending?: Record<string, number>;
    monthlyBudget: MonthlyBudget | null;
    displayMode?: 'flat' | 'grouped';
    viewMode?: 'month' | 'prevMonth' | 'year' | 'prevYear';
    includeTransfer?: boolean;
    includeInvestments?: boolean;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    spendingByCategory,
    investmentSpending = {},
    monthlyBudget,
    displayMode = 'flat',
    viewMode = 'month',
    includeTransfer = false,
    includeInvestments = false
}) => {
    const theme = useThemeClasses();

    // Group categories by type (expenses/investments/system/hidden)
    const groupedCategories = useMemo(() => {
        const active: Category[] = [];
        const investments: Category[] = [];
        const hidden: Category[] = [];
        const system: Category[] = [];

        categories.forEach(cat => {
            const hasExpense = (spendingByCategory[cat.id] || 0) > 0;
            const hasInvestment = (investmentSpending[cat.id] || 0) > 0;
            const isSystem = cat.isSystem || cat.id === 'transfer' || cat.id === 'adjustment';

            if (isSystem) {
                if (!includeTransfer && cat.id === 'transfer') {
                    return; // skip transfer when not included
                }
                system.push(cat);
            } else {
                // A category can appear in both sections if it has both expense and investment transactions
                if (hasExpense) {
                    active.push(cat);
                }
                if (hasInvestment) {
                    investments.push(cat);
                }
                // If neither, still show in active (for categories with 0 spend)
                if (!hasExpense && !hasInvestment) {
                    active.push(cat);
                }
            }
        });

        // Sort active categories by spend (high to low)
        active.sort((a, b) => {
            const spendA = spendingByCategory[a.id] || 0;
            const spendB = spendingByCategory[b.id] || 0;
            return spendB - spendA;
        });

        // Sort investments by amount
        investments.sort((a, b) => {
            const valA = investmentSpending[a.id] || 0;
            const valB = investmentSpending[b.id] || 0;
            return valB - valA;
        });

        return { active, investments, hidden, system };
    }, [categories, spendingByCategory, investmentSpending, includeTransfer]);

    // Build parent-group structures for expenses when in grouped mode
    const expenseGroups = useMemo(() => {
        if (displayMode !== 'grouped') return [] as Array<{ parent: Category; children: Category[]; total: number }>;
        const parents = categories.filter(c => !c.parentId && !c.isSystem && c.id !== 'transfer' && c.id !== 'adjustment');

        // Build groups ensuring each parent appears exactly once
        const activeIds = new Set(groupedCategories.active.map(c => c.id));
        const groups = parents.map(parent => {
            const children = groupedCategories.active.filter(c => c.parentId === parent.id);
            const total = children.length > 0
                ? children.reduce((sum, c) => sum + (spendingByCategory[c.id] || 0), 0)
                : (spendingByCategory[parent.id] || 0);
            return { parent, children, total };
        })
            // Include parents that either have children or are standalone roots present in active
            .filter(g => g.children.length > 0 || activeIds.has(g.parent.id));

        // Sort groups by total spend desc
        groups.sort((a, b) => b.total - a.total);
        return groups;
    }, [displayMode, categories, groupedCategories.active, spendingByCategory]);

    // Helper to get total spending for a section
    const getSectionTotal = (list: Category[], isInvestment: boolean) => {
        return list.reduce((sum, c) => sum + (isInvestment ? (investmentSpending[c.id] || 0) : (spendingByCategory[c.id] || 0)), 0);
    };

    // In flat view, show active categories along with system categories inline
    const flatCategories = useMemo(() => {
        // Identify all categories that act as parents
        const parentIds = new Set(categories.map(c => c.parentId).filter(Boolean));

        const combined = [...groupedCategories.active, ...groupedCategories.system]
            // Filter out categories that are parents (groups) unless they are system categories or strictly have no children in the context
            // Actually, simply: if it is a parent to someone, hide it in flat view.
            .filter(c => !parentIds.has(c.id));

        combined.sort((a, b) => {
            const spendA = spendingByCategory[a.id] || 0;
            const spendB = spendingByCategory[b.id] || 0;
            return spendB - spendA;
        });
        return combined;
    }, [groupedCategories.active, groupedCategories.system, spendingByCategory, categories]);

    // Render a single category item
    const renderCategoryItem = (category: Category, isInvestment = false) => {
        const spent = isInvestment
            ? (investmentSpending[category.id] || 0)
            : (spendingByCategory[category.id] || 0);

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
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                    'w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors flex items-center justify-between group',
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
                                {formatCurrency(getSectionTotal(groupedCategories.investments, true))}
                            </span>
                        </div>
                        {groupedCategories.investments.map(c => renderCategoryItem(c, true))}
                    </section>
                )}

                {/* Active Categories (Expenses) */}
                <section>
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Expenses
                        </h3>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Total: {formatCurrency(getSectionTotal(groupedCategories.active, false))}
                        </span>
                    </div>
                    {displayMode === 'grouped' ? (
                        <div className="space-y-2">
                            {expenseGroups.map(({ parent, children, total }) => (
                                <div key={parent.id}>
                                    {/* Parent header (non-selectable) */}
                                    <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700/50">
                                        <div className="flex items-center min-w-0 flex-1">
                                            <span className="text-xl mr-2 flex-shrink-0">{parent.icon}</span>
                                            <p className={cn('text-xs font-bold uppercase tracking-wider truncate', theme.textMuted)}>{parent.name}</p>
                                            <ChevronRight className="w-3 h-3 ml-2 flex-shrink-0" style={{ color: parent.color || '#3B82F6' }} />
                                        </div>
                                        <span className={cn('text-xs font-medium', theme.textMuted)}>{formatCurrency(total)}</span>
                                    </div>
                                    {/* Children items */}
                                    {children.length > 0 ? (
                                        children.map(child => renderCategoryItem(child, false))
                                    ) : (
                                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                            No categories in this group
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        flatCategories.map(c => renderCategoryItem(c, false))
                    )}
                </section>

                {/* System Categories (grouped mode only) */}
                {displayMode === 'grouped' && groupedCategories.system.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Settings className="w-3 h-3" /> System
                            </h3>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {formatCurrency(getSectionTotal(groupedCategories.system, false))}
                            </span>
                        </div>
                        {groupedCategories.system.map(c => renderCategoryItem(c, false))}
                    </section>
                )}

                {/* Hidden Categories (if any) */}
                {groupedCategories.hidden.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> Hidden
                            </h3>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {formatCurrency(getSectionTotal(groupedCategories.hidden, false))}
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
