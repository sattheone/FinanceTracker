import React, { useMemo, useState } from 'react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction, MonthlyBudget } from '../../types';
import { Category } from '../../constants/categories';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface CategoryOverviewProps {
    transactions: Transaction[];
    categories: Category[];
    monthlyBudget?: MonthlyBudget;
}

const CategoryOverview: React.FC<CategoryOverviewProps> = ({
    transactions,
    categories,
    monthlyBudget
}) => {
    const theme = useThemeClasses();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentRealMonthIndex = today.getMonth(); // The actual current month

    // State for the selected month filter (default to current month)
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentRealMonthIndex);

    // 1. Filter Expenses
    const expenses = useMemo(() =>
        transactions.filter(t => t.type === 'expense' && t.category && typeof t.category === 'string' && !t.category.toLowerCase().includes('transfer')),
        [transactions]);

    // 2. Metrics Calculation
    const metrics = useMemo(() => {
        let spentSelectedMonth = 0;
        let spentYear = 0;
        let monthsWithSpend = new Set<string>();

        expenses.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === currentYear) {
                spentYear += t.amount;
                monthsWithSpend.add(`${date.getMonth()}`);

                if (date.getMonth() === selectedMonthIndex) {
                    spentSelectedMonth += t.amount;
                }
            }
        });

        // Average based on months passed so far in current year (YTD)
        // We divide by (currentRealMonthIndex + 1) because if it's Feb (index 1), we have 2 months of data potentially
        const avgMonthly = currentRealMonthIndex === 0 ? spentYear : spentYear / (currentRealMonthIndex + 1);

        return { spentSelectedMonth, spentYear, avgMonthly };
    }, [expenses, currentYear, currentRealMonthIndex, selectedMonthIndex]);

    // 3. Chart Data (Current Year Jan-Dec)
    const chartData = useMemo(() => {
        const data = Array(12).fill(0).map((_, i) => ({
            name: new Date(currentYear, i, 1).toLocaleString('default', { month: 'narrow' }),
            fullMonth: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
            monthIndex: i,
            amount: 0,
            isCurrent: i === currentRealMonthIndex,
            isSelected: i === selectedMonthIndex
        }));

        expenses.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === currentYear) {
                data[date.getMonth()].amount += t.amount;
            }
        });

        return data;
    }, [expenses, currentYear, currentRealMonthIndex, selectedMonthIndex]);

    // 4. Top Categories Pill Data (Selected Month)
    const topCategories = useMemo(() => {
        const catMap = new Map<string, number>();
        expenses.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === currentYear && date.getMonth() === selectedMonthIndex) {
                catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
            }
        });

        return Array.from(catMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([id, amount]) => {
                const cat = categories.find(c => c.id === id);
                return {
                    name: cat?.name || id,
                    amount,
                    color: cat?.color || '#cbd5e1',
                    icon: cat?.icon
                };
            });
    }, [expenses, categories, currentYear, selectedMonthIndex]);


    // 5. Grouped Categories Data (Selected Month)
    const groupedData = useMemo(() => {
        // Map to store grouped data: ParentID -> { parent details, children: [] }
        const groups: Record<string, {
            id: string;
            name: string;
            icon: string;
            categories: any[]
        }> = {};

        // Aggregate spend per category for SELECTED month
        const categorySpend: Record<string, number> = {};
        expenses.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === currentYear && date.getMonth() === selectedMonthIndex) {
                categorySpend[t.category] = (categorySpend[t.category] || 0) + t.amount;
            }
        });

        // Initialize groups based on Root Categories or Orphan Holders
        categories.forEach(cat => {
            if (!cat.parentId) {
                groups[cat.id] = {
                    id: cat.id,
                    name: cat.name,
                    icon: cat.icon,
                    categories: []
                };
            }
        });

        // Ensure 'other' group exists if not already
        if (!groups['other']) {
            groups['other'] = { id: 'other', name: 'Other', icon: '📋', categories: [] };
        }

        // Distribute categories into groups
        categories.forEach(cat => {
            const spent = categorySpend[cat.id] || 0;
            const budget = monthlyBudget?.categoryBudgets?.[cat.id] || 0;
            const left = Math.max(0, budget - spent);

            const itemData = {
                ...cat,
                spent,
                budget,
                left
            };

            if (cat.parentId && groups[cat.parentId]) {
                groups[cat.parentId].categories.push(itemData);
            } else if (!cat.parentId) {
                // It's a root category. 
                // Only add it to its own list if it acts as a miscellaneous bucket for that group (has spend/budget)
                if (spent > 0 || budget > 0) {
                    groups[cat.id].categories.push(itemData);
                }
            } else {
                // Parent ID exists but parent not found -> Orphan -> Other
                groups['other'].categories.push(itemData);
            }
        });

        // Filter and Sort
        return Object.values(groups)
            .map(g => {
                const totalSpent = g.categories.reduce((sum, c) => sum + c.spent, 0);
                return {
                    ...g,
                    totalSpent,
                    categories: g.categories.sort((a, b) => b.spent - a.spent)
                };
            })
            // Only show groups that have spending or budget or active children
            .filter(g => g.totalSpent > 0 || g.categories.some(c => c.budget > 0))
            .sort((a, b) => b.totalSpent - a.totalSpent);

    }, [categories, expenses, currentYear, selectedMonthIndex, monthlyBudget]);


    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-lg">
                    <p className="text-sm font-medium mb-1">{payload[0].payload.fullMonth}</p>
                    <p className="text-blue-600 dark:text-blue-400 font-bold">
                        {formatCurrency(payload[0].value)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Click to filter</p>
                </div>
            );
        }
        return null;
    };

    const handleBarClick = (data: any) => {
        if (data && data.monthIndex !== undefined) {
            setSelectedMonthIndex(data.monthIndex);
        }
    };

    return (
        <div className="h-full overflow-y-scroll p-6 md:p-8 space-y-8 custom-scrollbar">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className={cn(theme.textPrimary, "text-2xl font-bold mb-4")}>All Regular Categories</h2>
                    <div className="flex flex-wrap gap-2">
                        {topCategories.map((cat, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                <span>{cat.icon || '🏷️'}</span>
                                <span>{cat.name.toUpperCase()}</span>
                            </div>
                        ))}
                        {topCategories.length > 0 && (
                            <div className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">
                                +{categories.length - topCategories.length}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                        Spent in {new Date(currentYear, selectedMonthIndex, 1).toLocaleString('default', { month: 'short' })}
                    </p>
                    <p className={cn(theme.textPrimary, "text-3xl font-bold")}>
                        {formatCurrency(metrics.spentSelectedMonth)}
                    </p>
                    {monthlyBudget && (
                        <p className="text-xs text-gray-400 mt-1">
                            {formatCurrency(monthlyBudget.income - monthlyBudget.expenses.investments - monthlyBudget.expenses.loans)} Budget
                        </p>
                    )}
                </div>
            </div>

            {/* Chart Section */}
            <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} onClick={(data) => {
                        if (data && data.activePayload && data.activePayload.length > 0) {
                            handleBarClick(data.activePayload[0].payload);
                        }
                    }}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            dy={10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="amount" radius={[4, 4, 4, 4]} barSize={12}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.isSelected
                                            ? '#22c55e' // Selected: Green
                                            : index > currentRealMonthIndex
                                                ? '#e2e8f0' // Future: Gray
                                                : '#cbd5e1' // Past/Other: Darker Gray
                                    }
                                    className={cn(
                                        "transition-all duration-300 cursor-pointer hover:opacity-80",
                                        entry.isSelected && "dark:fill-green-500", // Selected Dark Mode
                                        !entry.isSelected && index <= currentRealMonthIndex && "dark:fill-gray-600", // Past Dark Mode
                                        index > currentRealMonthIndex && "dark:fill-gray-800" // Future Dark Mode
                                    )}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-8 border-t border-b border-gray-100 dark:border-gray-800 py-6">
                <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Spent per year
                        {/* Help Icon can go here */}
                    </p>
                    <p className={cn(theme.textPrimary, "text-xl font-bold")}>{formatCurrency(metrics.spentYear)}</p>
                    <p className="text-xs text-gray-400 mt-1">{currentYear}</p>
                </div>
                <div className="text-right md:text-left">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Avg monthly spend
                    </p>
                    <p className={cn(theme.textPrimary, "text-xl font-bold")}>{formatCurrency(metrics.avgMonthly)}</p>
                    <p className="text-xs text-gray-400 mt-1">based on YTD</p>
                </div>
            </div>

            {/* Categories Table */}
            <div>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className={cn(theme.textPrimary, "text-base font-bold")}>Regular Categories</h3>
                    <div className="flex gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="w-24 text-right">Spent</span>
                        <span className="w-24 text-right">Budget</span>
                        <span className="w-24 text-right">Left</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {groupedData.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No spending in {new Date(currentYear, selectedMonthIndex, 1).toLocaleString('default', { month: 'long' })}
                        </div>
                    ) : (
                        groupedData.map((group) => (
                            <div key={group.id} className="relative">
                                {/* Group Header - Implicitly shows the grouping */}
                                <div className="flex items-center py-1.5 px-2 bg-gray-50 dark:bg-gray-800/80 rounded-lg mb-1">
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-base">{group.icon || '📁'}</span>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{group.name}</span>
                                    </div>
                                    <div className="flex gap-8 text-xs font-semibold text-gray-500 dark:text-gray-400 opacity-75">
                                        <span className="w-24 text-right">{formatCurrency(group.totalSpent)}</span>
                                        <span className="w-24 text-right">-</span>
                                        <span className="w-24 text-right">-</span>
                                    </div>
                                </div>

                                {/* Sub-categories (Indented) */}
                                <div className="space-y-0.5">
                                    {group.categories.map((cat: any) => (
                                        <div key={cat.id} className="flex items-center justify-between py-1 pl-9 pr-2 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded cursor-pointer transition-colors group/row">
                                            <div className="flex items-center gap-2">
                                                {/* Small indicator dot or just text */}
                                                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover/row:bg-blue-400"></div>
                                                <span className={cn(theme.textPrimary, "text-sm", cat.id === group.id && "italic text-gray-500")}>
                                                    {cat.name}
                                                </span>
                                            </div>

                                            <div className="flex gap-8 text-sm">
                                                <span className={cn(theme.textPrimary, "w-24 text-right font-medium text-xs")}>
                                                    {formatCurrency(cat.spent)}
                                                </span>
                                                <span className="w-24 text-right text-gray-500 font-medium text-xs hidden md:block">
                                                    {formatCurrency(cat.budget)}
                                                </span>
                                                <span className={cn("w-24 text-right font-medium text-xs", cat.left < 0 ? "text-red-500" : "text-green-500")}>
                                                    {formatCurrency(cat.left)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )))}
                </div>
            </div>
        </div>
    );
};

export default CategoryOverview;
