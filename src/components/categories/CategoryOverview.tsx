import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { MonthlyBudget, Transaction } from '../../types';
import { Category } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';
import { getOptimizedMonthlySummaries } from '../../services/categorySummaryService';

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
    const { userProfile } = useData();
    const { user } = useAuth();
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
    
    // State for how many months of history to show (start with 12, expand on scroll)
    const [monthsToShow, setMonthsToShow] = useState(12);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [optimizedSummaries, setOptimizedSummaries] = useState<
        Array<{ year: number; month: number; totalSpent: number; categoryTotals: Record<string, number> }>
    >([]);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        getOptimizedMonthlySummaries(user.id, monthsToShow)
            .then(list => {
                if (!cancelled) setOptimizedSummaries(list);
            })
            .catch(err => {
                console.warn('Failed to load optimized monthly summaries:', err);
            });
        return () => {
            cancelled = true;
        };
    }, [user?.id, monthsToShow]);
    
    // Calculate monthly summaries from local transactions for real-time accuracy
    // and fill missing months using optimized summaries from Firestore.
    const summaries = useMemo(() => {
        const summaryMap = new Map<string, { categoryTotals: Record<string, number>; totalSpent: number; year: number; month: number }>();
        
        // Filter to expense and investment types only (not income)
        transactions
            .filter(t => t.type === 'expense' || t.type === 'investment' || t.type === 'transfer')
            .forEach(t => {
                const txDate = new Date(t.date);
                const year = txDate.getFullYear();
                const month = txDate.getMonth() + 1; // 1-based
                const key = `${year}-${String(month).padStart(2, '0')}`;
                
                if (!summaryMap.has(key)) {
                    summaryMap.set(key, { categoryTotals: {}, totalSpent: 0, year, month });
                }
                
                const summary = summaryMap.get(key)!;
                const categoryId = t.category || 'uncategorized';
                summary.categoryTotals[categoryId] = (summary.categoryTotals[categoryId] || 0) + t.amount;
                summary.totalSpent += t.amount;
            });
        
        optimizedSummaries.forEach(summary => {
            const key = `${summary.year}-${String(summary.month).padStart(2, '0')}`;
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    categoryTotals: summary.categoryTotals || {},
                    totalSpent: summary.totalSpent || 0,
                    year: summary.year,
                    month: summary.month
                });
            }
        });

        return Array.from(summaryMap.values());
    }, [transactions, optimizedSummaries]);

    // Generate array of months going backwards from actual current month
    const monthsRange = useMemo(() => {
        const months: { year: number; month: number; key: string }[] = [];
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const date = new Date(actualYear, actualMonthIndex - i, 1);
            months.push({
                year: date.getFullYear(),
                month: date.getMonth(),
                key: `${date.getFullYear()}-${date.getMonth()}`
            });
        }
        return months;
    }, [monthsToShow, actualYear, actualMonthIndex]);

    // Metrics Calculation from summaries
    const metrics = useMemo(() => {
        let spentSelectedMonth = 0;
        let spentYear = 0;

        summaries.forEach(s => {
            // Yearly total
            if (s.year === currentYear) {
                spentYear += s.totalSpent;
            }
            // Selected month total (MonthlySummary uses 1-based month, selectedMonth uses 0-based)
            if (s.year === selectedMonth.year && s.month === selectedMonth.month + 1) {
                spentSelectedMonth = s.totalSpent;
            }
        });

        // Average based on months passed so far in current year (YTD)
        const avgMonthly = actualMonthIndex === 0 ? spentYear : spentYear / (actualMonthIndex + 1);

        return { spentSelectedMonth, spentYear, avgMonthly };
    }, [summaries, currentYear, actualMonthIndex, selectedMonth]);

    // Chart Data - Dynamic based on monthsRange and summaries
    const chartData = useMemo(() => {
        // Create a lookup map for fast access
        const summaryMap = new Map<string, typeof summaries[number]>();
        summaries.forEach(s => {
            summaryMap.set(`${s.year}-${s.month}`, s);
        });

        return monthsRange.map(({ year, month, key }) => {
            const isCurrent = year === actualYear && month === actualMonthIndex;
            const isSelected = year === selectedMonth.year && month === selectedMonth.month;
            
            // Get amount from summary (summaries use 1-based month, monthsRange uses 0-based)
            const summary = summaryMap.get(`${year}-${month + 1}`);
            const amount = summary?.totalSpent || 0;

            return {
                key,
                year,
                month,
                name: new Date(year, month, 1).toLocaleString('default', { month: 'narrow' }),
                fullMonth: new Date(year, month, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
                amount,
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

    // Handle scroll to load more months - expands the visible range
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        // Load more when scrolled to the left (near the beginning)
        if (container.scrollLeft < 100 && !isLoadingMore && monthsToShow < 120) {
            setIsLoadingMore(true);
            
            // Calculate the new range to load
            const newMonthsToShow = Math.min(monthsToShow + 12, 120);
            
            // Preserve scroll position by calculating offset
            const oldScrollWidth = container.scrollWidth;
            setMonthsToShow(newMonthsToShow);
            
            // After state update, adjust scroll to keep the same bars visible
            requestAnimationFrame(() => {
                const newScrollWidth = container.scrollWidth;
                const addedWidth = newScrollWidth - oldScrollWidth;
                container.scrollLeft = container.scrollLeft + addedWidth;
                setIsLoadingMore(false);
            });
        }
    }, [isLoadingMore, monthsToShow]);

    // Scroll to the end (current month) on initial render
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [transactions.length]);

    const handleBarClick = (data: typeof chartData[0]) => {
        setSelectedMonth({ year: data.year, month: data.month });
    };

    // Calculate max amount for scaling bars
    const maxAmount = useMemo(() => {
        return Math.max(...chartData.map(d => d.amount), 1);
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
                    {defaultTimePeriod === 'previous' && selectedMonth.year === currentYear && selectedMonth.month === currentRealMonthIndex && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Showing previous month by default
                        </p>
                    )}
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
                {isLoadingMore && (
                    <div className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    </div>
                )}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="w-full max-w-full min-w-0 overflow-x-auto pb-2 custom-scrollbar"
                    style={{ scrollBehavior: 'auto' }}
                >
                    <div className="flex items-end gap-1 h-40 min-w-max px-2">
                        {chartData.map((data, index) => {
                            const barHeight = maxAmount > 0 ? (data.amount / maxAmount) * 120 : 0;
                            const isFuture = data.year > currentYear || (data.year === currentYear && data.month > currentRealMonthIndex);
                            const showYear = index === 0 || data.month === 0; // Show year label on Jan or first bar
                            
                            return (
                                <div 
                                    key={data.key} 
                                    className="flex flex-col items-center group cursor-pointer"
                                    onClick={() => handleBarClick(data)}
                                >
                                    {/* Tooltip on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg border border-gray-100 dark:border-gray-700 text-xs whitespace-nowrap z-20">
                                        <p className="font-medium">{data.fullMonth}</p>
                                        <p className="text-primary-600 dark:text-primary-400 font-bold">{formatCurrency(data.amount)}</p>
                                    </div>
                                    
                                    {/* Bar */}
                                    <div 
                                        className={cn(
                                            "w-6 rounded-t transition-all duration-200 hover:opacity-80",
                                            data.isSelected 
                                                ? "bg-green-500" 
                                                : isFuture 
                                                    ? "bg-gray-200 dark:bg-gray-800" 
                                                    : "bg-gray-300 dark:bg-gray-600"
                                        )}
                                        style={{ height: Math.max(barHeight, 4) }}
                                    />
                                    
                                    {/* Month Label */}
                                    <span className={cn(
                                        "text-[10px] mt-1",
                                        data.isSelected ? "text-green-600 dark:text-green-400 font-bold" : "text-gray-400"
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
                {monthsToShow < 120 && (
                    <p className="text-xs text-gray-400 text-center mt-2">← Scroll left to load more months</p>
                )}
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 border-t border-b border-gray-100 dark:border-gray-800 py-6">
                <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Spent per year
                        {/* Help Icon can go here */}
                    </p>
                    <p className={cn(theme.textPrimary, "text-xl font-bold")}>{formatCurrency(metrics.spentYear)}</p>
                    <p className="text-xs text-gray-400 mt-1">{currentYear}</p>
                </div>
                <div className="text-right sm:text-left">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Avg monthly spend
                    </p>
                    <p className={cn(theme.textPrimary, "text-xl font-bold")}>{formatCurrency(metrics.avgMonthly)}</p>
                    <p className="text-xs text-gray-400 mt-1">based on YTD</p>
                </div>
            </div>

            {/* Categories Table */}
            <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 px-2 gap-2">
                    <h3 className={cn(theme.textPrimary, "text-base font-bold")}>Regular Categories</h3>
                    <div className="hidden sm:flex gap-6 md:gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="w-24 text-right">Spent</span>
                        <span className="w-24 text-right">Budget</span>
                        <span className="w-24 text-right">Left</span>
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
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-base">{group.icon || '📁'}</span>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{group.name}</span>
                                    </div>
                                    <div className="hidden sm:flex gap-6 md:gap-8 text-xs font-semibold text-gray-500 dark:text-gray-400 opacity-75">
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

                                            <div className="flex gap-4 sm:gap-6 md:gap-8 text-sm">
                                                <span className={cn(theme.textPrimary, "w-20 sm:w-24 text-right font-medium text-xs")}>
                                                    {formatCurrency(cat.spent)}
                                                </span>
                                                <span className="w-20 sm:w-24 text-right text-gray-500 font-medium text-xs hidden sm:block">
                                                    {formatCurrency(cat.budget)}
                                                </span>
                                                <span className={cn("w-20 sm:w-24 text-right font-medium text-xs", cat.left < 0 ? "text-red-500" : "text-green-500")}>
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
