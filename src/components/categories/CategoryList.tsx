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
    monthlyBudget: MonthlyBudget | null;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    spendingByCategory,
    monthlyBudget
}) => {
    const theme = useThemeClasses();

    // Group categories
    const groupedCategories = useMemo(() => {
        const active: Category[] = [];
        const hidden: Category[] = [];
        const system: Category[] = [];

        categories.forEach(cat => {
            if (cat.id === 'transfer' || cat.id === 'adjustment') {
                system.push(cat);
            } else if (cat.isSystem) {
                active.push(cat);
            } else {
                active.push(cat);
            }
        });

        // Sort active categories by spend (high to low)
        active.sort((a, b) => {
            const spendA = spendingByCategory[a.id] || 0;
            const spendB = spendingByCategory[b.id] || 0;
            return spendB - spendA;
        });

        return { active, hidden, system };
    }, [categories, spendingByCategory]);

    // Render a single category item
    const renderCategoryItem = (category: Category) => {
        const spent = spendingByCategory[category.id] || 0;
        const budgetAmount = monthlyBudget?.categoryBudgets?.[category.id] || 0;
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
                        className="w-2 h-8 rounded-full mr-3 flex-shrink-0"
                        style={{ backgroundColor: category.color || '#9CA3AF' }}
                    />
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

    return (
        <div className="h-full overflow-y-auto pr-2">
            <div className="space-y-6">
                {/* Active Categories */}
                <section>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                        Active
                    </h3>
                    {groupedCategories.active.map(renderCategoryItem)}
                </section>

                {/* System Categories (if any) */}
                {groupedCategories.system.length > 0 && (
                    <section>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                            <Settings className="w-3 h-3" /> System
                        </h3>
                        {groupedCategories.system.map(renderCategoryItem)}
                    </section>
                )}

                {/* Hidden Categories (if any) */}
                {groupedCategories.hidden.length > 0 && (
                    <section>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Hidden
                        </h3>
                        {groupedCategories.hidden.map(renderCategoryItem)}
                    </section>
                )}
            </div>
        </div>
    );
};

export default CategoryList;
