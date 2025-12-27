import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import CategoryList from '../components/categories/CategoryList';
import CategoryDetail from '../components/categories/CategoryDetail';
import CategoryOverview from '../components/categories/CategoryOverview';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import { X } from 'lucide-react';

const Categories: React.FC = () => {
    const { categories, transactions, monthlyBudget } = useData();
    const theme = useThemeClasses();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // --- 1. Aggregation for List View ---
    const currentMonth = useMemo(() => new Date(), []);

    const spendingByCategory = useMemo(() => {
        const spending: Record<string, number> = {};
        const currentMonthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const tDate = new Date(t.date);
                const tMonthKey = `${tDate.getFullYear()}-${tDate.getMonth()}`;

                if (tMonthKey === currentMonthKey) {
                    spending[t.category] = (spending[t.category] || 0) + t.amount;
                }
            }
        });
        return spending;
    }, [transactions, currentMonth]);

    // --- 2. Selection Handling ---

    const handleCategorySelect = (id: string) => {
        setSelectedCategoryId(id);
    };

    const selectedCategory = useMemo(() =>
        categories.find(c => c.id === selectedCategoryId),
        [categories, selectedCategoryId]);

    const categoryTransactions = useMemo(() =>
        transactions.filter(t => t.category === selectedCategoryId),
        [transactions, selectedCategoryId]);

    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden flex bg-white dark:bg-gray-900">

            {/* LEFT PANE: Category List */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col transition-all duration-300",
                selectedCategoryId ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h1 className={cn(theme.textPrimary, "text-xl font-bold")}>Categories</h1>
                </div>

                <div className="flex-1 overflow-hidden p-2">
                    <CategoryList
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={handleCategorySelect}
                        spendingByCategory={spendingByCategory}
                        monthlyBudget={monthlyBudget}
                    />
                </div>
            </div>

            {/* RIGHT PANE: Detail View */}
            <div className={cn(
                "flex-1 bg-white dark:bg-gray-900 flex flex-col min-w-0 transition-all duration-300",
                !selectedCategoryId ? "hidden md:flex" : "flex"
            )}>
                {selectedCategory ? (
                    <div className="h-full flex flex-col overflow-y-scroll">
                        {/* Mobile Header with Back Button */}
                        <div className="md:hidden p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                            <button
                                onClick={() => setSelectedCategoryId(null)}
                                className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                            <span className="font-semibold text-lg">{selectedCategory.name}</span>
                        </div>

                        <div className="flex-1">
                            <CategoryDetail
                                category={selectedCategory}
                                transactions={categoryTransactions}
                                monthlyBudget={monthlyBudget}
                                currentMonth={currentMonth}
                            />
                        </div>
                    </div>
                ) : (
                    <CategoryOverview
                        transactions={transactions}
                        categories={categories}
                        monthlyBudget={monthlyBudget}
                    />
                )}
            </div>

        </div>
    );
};

export default Categories;
