import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { MonthlyBudget, Transaction } from '../../types';
import { Category, getCategoryTransactionType, isTransferTransaction, resolveTransactionType } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';

interface CategoryOverviewProps {
    categories: Category[];
    monthlyBudget?: MonthlyBudget;
    transactions?: Transaction[];
}

const CategoryOverview: React.FC<CategoryOverviewProps> = ({
    categories,
    monthlyBudget,
    transactions = []
}) => {
    const { userProfile, monthlySummaries: contextSummaries } = useData();
    const theme = useThemeClasses();
    const defaultTimePeriod = userProfile?.displayPreferences?.defaultTimePeriod || 'current';
    const actualDate = useMemo(() => new Date(), []);
    const baseDate = useMemo(() => {
        const date = new Date();
        if (defaultTimePeriod === 'previous') {
            date.setMonth(date.getMonth() - 1);
        }
        return date;
    }, [defaultTimePeriod]);
    const currentYear = baseDate.getFullYear();
    const currentRealMonthIndex = baseDate.getMonth(); // The default month in view
    const actualYear = actualDate.getFullYear();
    const actualMonthIndex = actualDate.getMonth();

    // State for the selected month filter (default to current month)
    const [selectedMonth, setSelectedMonth] = useState({ year: currentYear, month: currentRealMonthIndex });

    useEffect(() => {
        setSelectedMonth({ year: currentYear, month: currentRealMonthIndex });
    }, [currentYear, currentRealMonthIndex]);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Use pre-fetched monthly summaries from DataContext (already cached in localStorage + Firestore)
    const optimizedSummaries = contextSummaries;
    
    // Calculate monthly summaries from local transactions for real-time accuracy
    // and fill missing months using optimized summaries from Firestore.
    const summaries = useMemo(() => {
        const summaryMap = new Map<string, { categoryTotals: Record<string, number>; totalSpent: number; expense: number; investment: number; income: number; year: number; month: number }>();
        
        // Create a fast map lookup for categories to resolved transaction types
        const categoryTypeMap: Record<string, string> = {};
        categories.forEach(c => {
            categoryTypeMap[c.id] = getCategoryTransactionType(c.id, categories);
        });

        transactions
            .filter(t => !isTransferTransaction(t, categories))
            .forEach(t => {
                const txDate = new Date(t.date);
                const year = txDate.getFullYear();
                const month = txDate.getMonth() + 1; // 1-based
                const key = `${year}-${String(month).padStart(2, '0')}`;
                
                if (!summaryMap.has(key)) {
                    summaryMap.set(key, { categoryTotals: {}, totalSpent: 0, expense: 0, investment: 0, income: 0, year, month });
                }
                
                const summary = summaryMap.get(key)!;
                const categoryId = t.category || 'uncategorized';
                summary.categoryTotals[categoryId] = (summary.categoryTotals[categoryId] || 0) + t.amount;
                
                const resolvedType = resolveTransactionType(t, categories);
                if (resolvedType === 'income') {
                    summary.income += t.amount;
                } else if (resolvedType === 'investment') {
                    summary.investment += t.amount;
                    summary.totalSpent += t.amount;
                } else if (resolvedType === 'expense') {
                    summary.expense += t.amount;
                    summary.totalSpent += t.amount;
                }
            });
        
        // Fill missing months from pre-aggregated summaries (hybrid offline approach)
        optimizedSummaries.forEach(summary => {
            const key = `${summary.year}-${String(summary.month).padStart(2, '0')}`;
            if (!summaryMap.has(key)) {
                let expense = summary.expense || 0;
                let income = summary.income || 0;
                let investment = summary.investment || 0;

                // If type breakdown is missing (legacy data), derive from categoryTotals
                const hasTypeBreakdown = expense > 0 || income > 0 || investment > 0;
                if (!hasTypeBreakdown && summary.categoryTotals) {
                    Object.entries(summary.categoryTotals).forEach(([catId, amount]) => {
                        const catType = getCategoryTransactionType(catId, categories);
                        if (catType === 'income') {
                            income += amount;
                        } else if (catType === 'investment') {
                            investment += amount;
                        } else {
                            expense += amount;
                        }
                    });
                }

                summaryMap.set(key, {
                    categoryTotals: summary.categoryTotals || {},
                    totalSpent: summary.totalSpent || 0,
                    expense,
                    income,
                    investment,
                    year: summary.year,
                    month: summary.month
                });
            }
        });

        return Array.from(summaryMap.values());
    }, [transactions, optimizedSummaries, categories]);

    // Generate array of months from earliest available data month to current month
    const monthsRange = useMemo(() => {
        const sorted = [...summaries].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });

        const earliest = sorted[0]
            ? new Date(sorted[0].year, sorted[0].month - 1, 1)
            : new Date(actualYear, actualMonthIndex, 1);

        const current = new Date(actualYear, actualMonthIndex, 1);
        const months: { year: number; month: number; key: string }[] = [];

        for (let date = new Date(earliest); date <= current; date = new Date(date.getFullYear(), date.getMonth() + 1, 1)) {
            months.push({
                year: date.getFullYear(),
                month: date.getMonth(),
                key: `${date.getFullYear()}-${date.getMonth()}`
            });
        }

        return months;
    }, [summaries, actualYear, actualMonthIndex]);

    // Metrics Calculation — compute directly from transactions by type (same
    // source of truth the sidebar uses) so numbers always match.
    const metrics = useMemo(() => {
        let spentSelectedMonth = 0;

        summaries.forEach(s => {
            if (s.year === selectedMonth.year && s.month === selectedMonth.month + 1) {
                spentSelectedMonth = s.expense;
            }
        });

        const prevYear = currentYear - 1;
        const monthsElapsed = actualMonthIndex + 1;

        let thisYearExpense = 0;
        let thisYearInvest = 0;
        let prevYearExpense = 0;
        let prevYearInvest = 0;

        const categoryTypeMap: Record<string, string> = {};
        categories.forEach(c => {
            categoryTypeMap[c.id] = getCategoryTransactionType(c.id, categories);
        });

        transactions.forEach(t => {
            if (t.category === 'transfer') return;
            const categoryId = t.category || 'uncategorized';
            const resolvedType = categoryTypeMap[categoryId] || 'expense';
            if (resolvedType === 'transfer') return;

            const d = new Date(t.date);
            const yr = d.getFullYear();

            if (yr === currentYear) {
                if (resolvedType === 'expense') {
                    thisYearExpense += t.amount || 0;
                } else if (resolvedType === 'investment') {
                    thisYearInvest += t.amount || 0;
                }
            } else if (yr === prevYear) {
                if (resolvedType === 'expense') {
                    prevYearExpense += t.amount || 0;
                } else if (resolvedType === 'investment') {
                    prevYearInvest += t.amount || 0;
                }
            }
        });

        return {
            spentSelectedMonth,
            thisYear: {
                year: currentYear,
                spent: thisYearExpense,
                avgMonthly: thisYearExpense / monthsElapsed,
                invested: thisYearInvest,
                avgMonthlyInvest: thisYearInvest / monthsElapsed
            },
            prevYear: {
                year: prevYear,
                spent: prevYearExpense,
                avgMonthly: prevYearExpense / 12,
                invested: prevYearInvest,
                avgMonthlyInvest: prevYearInvest / 12
            }
        };
    }, [summaries, currentYear, actualMonthIndex, selectedMonth, transactions, categories]);

    // Chart Data - Dynamic based on monthsRange and summaries
    const chartData = useMemo(() => {
        const summaryMap = new Map<string, typeof summaries[number]>();
        summaries.forEach(s => {
            summaryMap.set(`${s.year}-${s.month}`, s);
        });

        return monthsRange.map(({ year, month, key }) => {
            const isCurrent = year === actualYear && month === actualMonthIndex;
            const isSelected = year === selectedMonth.year && month === selectedMonth.month;
            
            const summary = summaryMap.get(`${year}-${month + 1}`);
            const expense = summary?.expense || 0;
            const investment = summary?.investment || 0;
            const income = summary?.income || 0;
            const amount = expense + investment + income;

            return {
                key,
                year,
                month,
                name: new Date(year, month, 1).toLocaleString('default', { month: 'narrow' }),
                fullMonth: new Date(year, month, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
                amount,
                expense,
                investment,
                income,
                isCurrent,
                isSelected
            };
        });
    }, [monthsRange, summaries, actualYear, actualMonthIndex, selectedMonth]);

    // Top Categories Pill Data (Selected Month) from summaries
    const topCategories = useMemo(() => {
        // Find the summary for the selected month
        const selectedSummary = summaries.find(
            s => s.year === selectedMonth.year && s.month === selectedMonth.month + 1
        );
        
        if (!selectedSummary?.categoryTotals) return [];
        
        return Object.entries(selectedSummary.categoryTotals)
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
    }, [summaries, categories, selectedMonth]);


    // Grouped Categories Data (Selected Month) from summaries
    const groupedData = useMemo(() => {
        // Map to store grouped data: ParentID -> { parent details, children: [] }
        const groups: Record<string, {
            id: string;
            name: string;
            icon: string;
            categories: any[]
        }> = {};

        // Find the summary for the selected month and get category totals
        const selectedSummary = summaries.find(
            s => s.year === selectedMonth.year && s.month === selectedMonth.month + 1
        );
        const categorySpend: Record<string, number> = selectedSummary?.categoryTotals || {};

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

    }, [categories, summaries, selectedMonth, monthlyBudget]);

    // Scroll to the end (current month) on initial render
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [chartData.length]);

    const handleBarClick = (data: typeof chartData[0]) => {
        setSelectedMonth({ year: data.year, month: data.month });
    };

    // Calculate max amount for scaling bars (based on tallest stacked total)
    const maxAmount = useMemo(() => {
        return Math.max(...chartData.map(d => d.expense + d.investment + d.income), 1);
    }, [chartData]);

    return (
        <div className="h-full w-full min-w-0 overflow-y-scroll overflow-x-hidden p-6 md:p-8 space-y-8 custom-scrollbar">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div className="min-w-0">
                    <h2 className={cn(theme.textPrimary, "text-2xl font-bold mb-4")}>All Regular Categories</h2>
                    <div className="flex flex-wrap gap-2 max-w-full">
                        {topCategories.map((cat, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[10rem]">
                                <span>{cat.icon || '🏷️'}</span>
                                <span className="truncate">{cat.name.toUpperCase()}</span>
                            </div>
                        ))}
                        {topCategories.length > 0 && (
                            <div className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">
                                +{categories.length - topCategories.length}
                            </div>
                        )}
                    </div>
                </div>
                <div className="w-full md:w-auto md:text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                        Spent in {new Date(selectedMonth.year, selectedMonth.month, 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
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

            {/* Chart Section - Horizontally Scrollable */}
            <div className="relative mt-4 min-w-0">
                <div 
                    ref={scrollContainerRef}
                    className="w-full max-w-full min-w-0 overflow-x-auto pb-2 custom-scrollbar"
                    style={{ scrollBehavior: 'auto' }}
                >
                    <div className="flex items-end gap-1 h-40 min-w-max px-2">
                        {chartData.map((data, index) => {
                            const BAR_MAX = 120;
                            const expenseH = maxAmount > 0 ? (data.expense / maxAmount) * BAR_MAX : 0;
                            const investH  = maxAmount > 0 ? (data.investment / maxAmount) * BAR_MAX : 0;
                            const incomeH  = maxAmount > 0 ? (data.income / maxAmount) * BAR_MAX : 0;
                            const hasData  = data.expense > 0 || data.investment > 0 || data.income > 0;
                            const stackedH = hasData ? Math.max(expenseH + investH + incomeH, 4) : 4;
                            const isFuture = data.year > actualYear || (data.year === actualYear && data.month > actualMonthIndex);
                            const showYear = index === 0 || data.month === 0;
                            
                            return (
                                <div 
                                    key={data.key} 
                                    className="flex flex-col items-center group cursor-pointer"
                                    onClick={() => handleBarClick(data)}
                                >
                                    {/* Tooltip on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-white dark:bg-gray-800 px-2 py-1.5 rounded shadow-lg border border-gray-100 dark:border-gray-700 text-xs whitespace-nowrap z-20 pointer-events-none">
                                        <p className="font-semibold mb-0.5">{data.fullMonth}</p>
                                        {data.expense > 0    && <p className="text-red-500">Exp: {formatCurrency(data.expense)}</p>}
                                        {data.investment > 0 && <p className="text-purple-500">Inv: {formatCurrency(data.investment)}</p>}
                                        {data.income > 0     && <p className="text-green-500">Inc: {formatCurrency(data.income)}</p>}
                                        {!hasData && <p className="text-gray-400">No data</p>}
                                    </div>
                                    
                                    {/* Stacked Bar */}
                                    {isFuture ? (
                                        <div className="w-6 rounded-t bg-gray-200 dark:bg-gray-800" style={{ height: 4 }} />
                                    ) : (
                                        <div
                                            className="flex flex-col-reverse w-6 rounded-t overflow-hidden transition-opacity duration-200 hover:opacity-80"
                                            style={{ height: stackedH }}
                                        >
                                            {/* expense — bottom */}
                                            {expenseH > 0 && (
                                                <div style={{ height: expenseH, backgroundColor: data.isSelected ? '#EF4444' : '#FCA5A5' }} />
                                            )}
                                            {/* investment — middle */}
                                            {investH > 0 && (
                                                <div style={{ height: investH, backgroundColor: data.isSelected ? '#8B5CF6' : '#C4B5FD' }} />
                                            )}
                                            {/* income — top */}
                                            {incomeH > 0 && (
                                                <div style={{ height: incomeH, backgroundColor: data.isSelected ? '#10B981' : '#6EE7B7' }} />
                                            )}
                                            {/* placeholder when no data */}
                                            {!hasData && (
                                                <div className="flex-1 bg-gray-300 dark:bg-gray-600" />
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Month Label */}
                                    <span className={cn(
                                        "text-[10px] mt-1",
                                        data.isSelected ? "font-bold text-gray-700 dark:text-gray-200" : "text-gray-400"
                                    )}>
                                        {data.name}
                                    </span>
                                    
                                    {/* Year Label */}
                                    {showYear && (
                                        <span className="text-[9px] text-gray-400 -mt-0.5">
                                            {data.year}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 justify-center mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#EF4444' }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Expenses</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8B5CF6' }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Investments</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Income</span>
                    </div>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="border-t border-b border-gray-100 dark:border-gray-800 py-6">
                {/* Header */}
                <div className="grid gap-2 sm:gap-4 mb-3" style={{ gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr' }}>
                    <div />
                    <p className="text-xs font-medium text-red-500 dark:text-red-400">Expenses / yr</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg / mo</p>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Invested / yr</p>
                    <p className="text-xs font-medium text-purple-500 dark:text-purple-300">Avg / mo</p>
                </div>

                <div className="space-y-3">
                    {[metrics.thisYear, metrics.prevYear].map(row => (
                        <div key={row.year} className="grid gap-2 sm:gap-4 items-center" style={{ gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr' }}>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-10">{row.year}</p>
                            <p className={cn(theme.textPrimary, "text-base sm:text-lg font-bold")}>{formatCurrency(row.spent)}</p>
                            <p className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400">{formatCurrency(row.avgMonthly)}</p>
                            <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(row.invested)}</p>
                            <p className="text-base sm:text-lg font-bold text-purple-500 dark:text-purple-300">{formatCurrency(row.avgMonthlyInvest)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Categories Table */}
            <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 px-2 gap-2">
                    <h3 className={cn(theme.textPrimary, "text-base font-bold")}>Regular Categories</h3>
                    <div className="hidden sm:flex gap-6 md:gap-3 lg:gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="w-24 md:w-20 lg:w-24 text-right">Spent</span>
                        <span className="w-24 md:w-20 lg:w-24 text-right">Budget</span>
                        <span className="w-24 md:w-20 lg:w-24 text-right">Left</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {groupedData.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No spending in {new Date(selectedMonth.year, selectedMonth.month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                    ) : (
                        groupedData.map((group) => (
                            <div key={group.id} className="relative">
                                {/* Group Header - Implicitly shows the grouping */}
                                <div className="flex items-center py-1.5 px-2 bg-gray-50 dark:bg-gray-800/80 rounded-lg mb-1">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-base">{group.icon || '📁'}</span>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{group.name}</span>
                                    </div>
                                    <div className="hidden sm:flex gap-6 md:gap-3 lg:gap-8 text-xs font-semibold text-gray-500 dark:text-gray-400 opacity-75">
                                        <span className="w-24 md:w-20 lg:w-24 text-right">{formatCurrency(group.totalSpent)}</span>
                                        <span className="w-24 md:w-20 lg:w-24 text-right">-</span>
                                        <span className="w-24 md:w-20 lg:w-24 text-right">-</span>
                                    </div>
                                </div>

                                {/* Sub-categories (Indented) */}
                                <div className="space-y-0.5">
                                    {group.categories.map((cat: any) => (
                                        <div key={cat.id} className="flex items-center justify-between gap-2 py-1 pl-9 pr-2 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded cursor-pointer transition-colors group/row">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {/* Small indicator dot or just text */}
                                                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover/row:bg-blue-400"></div>
                                                <span className={cn(theme.textPrimary, "text-sm", cat.id === group.id && "italic text-gray-500")}>
                                                    {cat.name}
                                                </span>
                                            </div>

                                            <div className="flex flex-shrink-0 gap-4 sm:gap-6 md:gap-3 lg:gap-8 text-sm">
                                                <span className={cn(theme.textPrimary, "w-20 sm:w-24 md:w-20 lg:w-24 text-right font-medium text-xs")}>
                                                    {formatCurrency(cat.spent)}
                                                </span>
                                                <span className="w-20 sm:w-24 md:w-20 lg:w-24 text-right text-gray-500 font-medium text-xs hidden sm:block">
                                                    {formatCurrency(cat.budget)}
                                                </span>
                                                <span className={cn("w-20 sm:w-24 md:w-20 lg:w-24 text-right font-medium text-xs", cat.left < 0 ? "text-red-500" : "text-green-500")}>
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
