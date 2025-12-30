import React, { useMemo } from 'react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { MonthlyBudget } from '../../types';
import { Category } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';
import { Settings, EyeOff } from 'lucide-react';

interface CategoryListProps {
    categories: Category[];
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string) => void;
    spendingByCategory: Record<string, number>;
    investmentSpending?: Record<string, number>;
    monthlyBudget: MonthlyBudget | null;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    spendingByCategory,
    investmentSpending = {},
    monthlyBudget
}) => {
    const theme = useThemeClasses();

    // Group categories
    const groupedCategories = useMemo(() => {
        const active: Category[] = [];
        const investments: Category[] = [];
        const hidden: Category[] = [];
        const system: Category[] = [];

        categories.forEach(cat => {
            const hasExpense = (spendingByCategory[cat.id] || 0) > 0;
            const hasInvestment = (investmentSpending[cat.id] || 0) > 0;
            const isSystem = cat.id === 'transfer' || cat.id === 'adjustment';

            if (isSystem) {
                system.push(cat);
            } else if (hasInvestment) {
                investments.push(cat);
            } else if (hasExpense || cat.isSystem) { // Keep existing logic for active
                active.push(cat);
            } else {
                // If 0 spend, fallback to original logic or put in active if not hidden?
                // Original logic: if (cat.isSystem) active else...
                // Actually original logic pushed ALL non-system to active.
                // Let's preserve that: if not investment, put in active (which handles 0 spend items).
                active.push(cat);
            }
        });

        // Filter out investments from active if we pushed them there by default fallback
        // Actually, let's look at the logic above.
        // If hasInvestment -> investments.
        // Else -> active.
        // This effectively moves them.

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
    }, [categories, spendingByCategory, investmentSpending]);

    // Render a single category item
    const renderCategoryItem = (category: Category, isInvestment = false) => {
        const spent = isInvestment
            ? (investmentSpending[category.id] || 0)
            : (spendingByCategory[category.id] || 0);

        const budgetAmount = !isInvestment ? (monthlyBudget?.categoryBudgets?.[category.id] || 0) : 0;
        const isSelected = selectedCategoryId === category.id;

        // Progress bar calculations
        const progress = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
        const isOverBudget = budgetAmount > 0 && spent > budgetAmount;

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
                        </p>
                        {budgetAmount > 0 && (
                            <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full",
                                        isOverBudget ? "bg-red-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${progress}%` }}
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
                            / {formatCurrency(budgetAmount)}
                        </p>
                    )}
                </div>
            </button>
        );
    };

    // Calculate total for a group
    const getSectionTotal = (group: Category[], isInvestment: boolean) => {
        return group.reduce((sum, cat) => {
            const val = isInvestment
                ? (investmentSpending[cat.id] || 0)
                : (spendingByCategory[cat.id] || 0);
            return sum + val;
        }, 0);
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="space-y-6 py-2">
                {/* Investment Categories */}
                {groupedCategories.investments.length > 0 && (
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
                            {formatCurrency(getSectionTotal(groupedCategories.active, false))}
                        </span>
                    </div>
                    {groupedCategories.active.map(c => renderCategoryItem(c, false))}
                </section>

                {/* System Categories (if any) */}
                {groupedCategories.system.length > 0 && (
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
