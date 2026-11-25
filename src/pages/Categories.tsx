import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import CategoryList from '../components/categories/CategoryList';
import CategoryDetail from '../components/categories/CategoryDetail';
import CategoryOverview from '../components/categories/CategoryOverview';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import { X, ChevronDown, Filter, Building2, TrendingUp, Plus, List, Wallet } from 'lucide-react';
import SidePanel from '../components/common/SidePanel';
import CategoryForm, { CategoryFormHandle } from '../components/categories/CategoryForm';
import { Transaction } from '../types';
import { resolveTransactionType } from '../constants/categories';

// Module-level cache: survives component unmount/remount across navigations
const yearCategoryCache = new Map<string, Transaction[]>();

const Categories: React.FC = () => {
    const { categories, transactions, monthlyBudget, bankAccounts, addCategory, loadTransactionsForPeriod, userProfile, updateTransaction, categorySummaryVersion } = useData();
    const theme = useThemeClasses();
    const [searchParams] = useSearchParams();


    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const defaultViewMode: 'month' | 'prevMonth' =
        userProfile?.displayPreferences?.defaultTimePeriod === 'previous' ? 'prevMonth' : 'month';
    const [viewMode, setViewMode] = useState<'month' | 'prevMonth' | 'year' | 'prevYear'>(defaultViewMode);
    const [includeInvestments, setIncludeInvestments] = useState(() => {
        try { return localStorage.getItem('categoryFilter:includeInvestments') === 'true'; } catch { return false; }
    });
    const [includeIncome, setIncludeIncome] = useState(() => {
        try { return localStorage.getItem('categoryFilter:includeIncome') === 'true'; } catch { return false; }
    });
    const [includeTransfer, setIncludeTransfer] = useState(() => {
        try { return localStorage.getItem('categoryFilter:includeTransfer') === 'true'; } catch { return false; }
    });
    const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
        try { return localStorage.getItem('categoryFilter:accountId') || 'all'; } catch { return 'all'; }
    });
    const [showFilters, setShowFilters] = useState(false);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<CategoryFormHandle | null>(null);

    // Persist filter changes to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('categoryFilter:includeInvestments', String(includeInvestments));
            localStorage.setItem('categoryFilter:includeIncome', String(includeIncome));
            localStorage.setItem('categoryFilter:includeTransfer', String(includeTransfer));
            localStorage.setItem('categoryFilter:accountId', selectedAccountId);
        } catch { /* quota exceeded — ignore */ }
    }, [includeInvestments, includeIncome, includeTransfer, selectedAccountId]);
    

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilters(false);
            }
        };
        if (showFilters) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilters]);

    // Load transactions for the currently viewed period
    // For 'month' and 'prevMonth': load just that single month
    // For 'year' and 'prevYear': load all months of the target year
    //   (each month is individually cached in localStorage, so only the first visit costs reads)
    // Load transactions for the currently viewed period.
    // For 'month' and 'prevMonth': load just that single month.
    // For 'year' and 'prevYear': load all 12 months of the target year in parallel.
    //   (each month is individually cached in localStorage, so cached months cost 0 reads and load instantly).
    useEffect(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-based
        
        if (viewMode === 'month') {
            const startDate = new Date(currentYear, currentMonth, 1);
            const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
            loadTransactionsForPeriod(startDate.toISOString(), endDate.toISOString());
        } else if (viewMode === 'prevMonth') {
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const startDate = new Date(prevYear, prevMonth, 1);
            const endDate = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);
            loadTransactionsForPeriod(startDate.toISOString(), endDate.toISOString());
        } else if (viewMode === 'year') {
            for (let m = 0; m < 12; m++) {
                const startDate = new Date(currentYear, m, 1);
                const endDate = new Date(currentYear, m + 1, 0, 23, 59, 59);
                loadTransactionsForPeriod(startDate.toISOString(), endDate.toISOString());
            }
        } else if (viewMode === 'prevYear') {
            const prevYear = currentYear - 1;
            for (let m = 0; m < 12; m++) {
                const startDate = new Date(prevYear, m, 1);
                const endDate = new Date(prevYear, m + 1, 0, 23, 59, 59);
                loadTransactionsForPeriod(startDate.toISOString(), endDate.toISOString());
            }
        }
    }, [viewMode, loadTransactionsForPeriod]);

    // When a category is selected, load a trailing history window so the
    // detail chart shows a multi-month trend rather than just the current period.
    useEffect(() => {
        if (!selectedCategoryId) return;
        const now = new Date();
        for (let i = 1; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
            const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            loadTransactionsForPeriod(startDate.toISOString(), endDate.toISOString());
        }
    }, [selectedCategoryId, loadTransactionsForPeriod]);

    // Read view mode from URL
    useEffect(() => {
        const view = searchParams.get('view');
        if (view === 'prevYear' || view === 'year' || view === 'month' || view === 'prevMonth') {
            setViewMode(view as any);
        }
    }, [searchParams]);

    useEffect(() => {
        const view = searchParams.get('view');
        if (view) return;
        const preferred = userProfile?.displayPreferences?.defaultTimePeriod === 'previous' ? 'prevMonth' : 'month';
        setViewMode(preferred);
    }, [userProfile?.displayPreferences?.defaultTimePeriod, searchParams]);

    // Invalidate year category detail cache whenever summaries/transactions are updated.
    useEffect(() => {
        yearCategoryCache.clear();
    }, [categorySummaryVersion]);



    // Filter transactions by account first (only used when category is selected)
    const filteredTransactions = useMemo(() => {
        if (selectedAccountId === 'all') return transactions;
        return transactions.filter(t => t.bankAccountId === selectedAccountId);
    }, [transactions, selectedAccountId]);

    // --- 1. Convert summaries to spending records for CategoryList ---
    const currentMonth = useMemo(() => {
        const now = new Date();
        if (viewMode === 'prevMonth') {
            return new Date(now.getFullYear(), now.getMonth() - 1, 1);
        } else if (viewMode === 'prevYear') {
            return new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        return now;
    }, [viewMode]);

    const { expenseSpending, investmentSpending, incomeSpending, transferSpending } = useMemo(() => {
        const expenses: Record<string, number> = {};
        const investments: Record<string, number> = {};
        const income: Record<string, number> = {};
        const transfers: Record<string, number> = {};
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1; // 1-based
        
        // Filter transactions based on viewMode
        const relevantTransactions = filteredTransactions.filter(t => {
            const txDate = new Date(t.date);
            const txYear = txDate.getFullYear();
            const txMonth = txDate.getMonth() + 1;
            
            if (viewMode === 'month') {
                return txYear === currentYear && txMonth === currentMonthNum;
            } else if (viewMode === 'prevMonth') {
                const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
                const prevMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
                return txYear === prevMonthYear && txMonth === prevMonth;
            } else if (viewMode === 'year') {
                return txYear === currentYear;
            } else { // prevYear
                return txYear === currentYear - 1;
            }
        });
        
        // Calculate spending by category and type from transactions
        relevantTransactions.forEach(t => {
            const categoryId = t.category || 'uncategorized';
            const amount = t.amount || 0;
            const resolvedType = resolveTransactionType(t, categories);
            
            if (resolvedType === 'transfer') {
                transfers[categoryId] = (transfers[categoryId] || 0) + amount;
            } else if (resolvedType === 'investment') {
                investments[categoryId] = (investments[categoryId] || 0) + amount;
            } else if (resolvedType === 'income') {
                income[categoryId] = (income[categoryId] || 0) + amount;
            } else {
                expenses[categoryId] = (expenses[categoryId] || 0) + amount;
            }
        });
        
        return {
            expenseSpending: expenses,
            investmentSpending: investments,
            incomeSpending: income,
            transferSpending: transfers
        };
    }, [filteredTransactions, viewMode, categories]);

    // --- 2. Selection Handling ---

    const handleCategorySelect = (id: string) => {
        setSelectedCategoryId(id);
    };

    const selectedCategory = useMemo(() =>
        categories.find(c => c.id === selectedCategoryId),
        [categories, selectedCategoryId]);

    // Set of category IDs to match (includes children if a group is selected)
    const selectedCategoryIds = useMemo(() => {
        if (!selectedCategoryId) return new Set<string>();
        const childIds = categories.filter(c => c.parentId === selectedCategoryId).map(c => c.id);
        return childIds.length > 0
            ? new Set([selectedCategoryId, ...childIds])
            : new Set([selectedCategoryId]);
    }, [selectedCategoryId, categories]);

    // Period-scoped transactions for the stats + list in the detail view
    const categoryTransactions = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1;

        return filteredTransactions.filter(t => {
            if (!selectedCategoryIds.has(t.category || '')) return false;
            const txDate = new Date(t.date);
            const txYear = txDate.getFullYear();
            const txMonth = txDate.getMonth() + 1;

            if (viewMode === 'month') {
                return txYear === currentYear && txMonth === currentMonthNum;
            } else if (viewMode === 'prevMonth') {
                const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
                const prevMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
                return txYear === prevMonthYear && txMonth === prevMonth;
            } else if (viewMode === 'year') {
                return txYear === currentYear;
            } else { // prevYear
                return txYear === currentYear - 1;
            }
        });
    }, [filteredTransactions, selectedCategoryIds, viewMode]);

    // All loaded transactions for the category (no period filter) — drives the history chart
    const categoryChartTransactions = useMemo(() => {
        if (!selectedCategoryId) return [];
        return filteredTransactions.filter(t => selectedCategoryIds.has(t.category || ''));
    }, [filteredTransactions, selectedCategoryIds, selectedCategoryId]);

    const handleCategoryDetailUpdate = async (transactionId: string, updates: Partial<Transaction>) => {
        await updateTransaction(transactionId, updates);
    };

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedAccountId !== 'all') count++;
        if (includeInvestments) count++;
        if (includeIncome) count++;
        if (includeTransfer) count++;
        return count;
    }, [selectedAccountId, includeInvestments, includeIncome, includeTransfer]);

    // Get account display name with last 4 digits
    const getAccountName = (accountId: string) => {
        if (accountId === 'all') return 'All Accounts';
        const account = bankAccounts.find(a => a.id === accountId);
        if (!account) return 'Unknown';
        const last4 = account.number?.slice(-4);
        return last4 ? `${account.bank} ••${last4}` : account.bank;
    };

    return (
        <div className="h-full lg:h-[calc(100vh-4rem)] flex theme-bg-primary overflow-hidden min-w-0">

            {/* LEFT PANE: Category List */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 theme-bg-primary flex flex-col overflow-visible",
                selectedCategoryId ? "hidden md:flex" : "flex"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 overflow-visible">
                    <div className="flex items-center justify-between mb-3">
                        <h1
                            className={cn(theme.textPrimary, "text-xl font-bold cursor-pointer hover:opacity-70 transition-opacity")}
                            onClick={() => setSelectedCategoryId(null)}
                        >
                            Categories
                        </h1>

                        {/* Header Actions: Filter + Add */}
                        <div className="flex items-center gap-2">
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={cn(
                                        "relative p-2 rounded-lg transition-all",
                                        showFilters || activeFilterCount > 0
                                            ? "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-primary)]"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-medium rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}>
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                {/* Popover Content */}
                                {showFilters && (
                                    <div className="fixed mt-1.5 w-72 popup-surface rounded-xl z-[100]"
                                        style={{
                                            top: filterRef.current?.getBoundingClientRect().bottom ?? 0,
                                            left: Math.max(16, (filterRef.current?.getBoundingClientRect().right ?? 0) - 288),
                                            backgroundColor: 'var(--color-card-bg)',
                                            borderColor: 'var(--color-border-primary)'
                                        }}>
                                        <div className="p-3 space-y-3">
                                            {/* Account Filter */}
                                            <div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    <span>Account</span>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        value={selectedAccountId}
                                                        onChange={(e) => setSelectedAccountId(e.target.value)}
                                                        className="w-full appearance-none text-xs font-medium pl-2 pr-6 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-2 truncate input-field"
                                                    >
                                                        <option value="all">All Accounts</option>
                                                        {bankAccounts.map(account => {
                                                            const last4 = account.number?.slice(-4);
                                                            const displayName = last4 ? `${account.bank} ••${last4}` : account.bank;
                                                            return (
                                                                <option key={account.id} value={account.id}>
                                                                    {account.logo} {displayName}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Investment Toggle */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    <span>Include Investments</span>
                                                </div>
                                                <button
                                                    onClick={() => setIncludeInvestments(!includeInvestments)}
                                                    className={cn(
                                                        "relative w-9 h-5 rounded-full transition-colors",
                                                        includeInvestments
                                                            ? "[background-color:var(--color-accent-primary)]"
                                                            : "bg-gray-300 dark:bg-gray-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "absolute top-0.5 left-0.5 w-4 h-4 keep-white rounded-full shadow transition-transform",
                                                            includeInvestments && "translate-x-4"
                                                        )}
                                                    />
                                                </button>
                                            </div>

                                            {/* Income Toggle */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <Wallet className="w-3.5 h-3.5" />
                                                    <span>Include Income</span>
                                                </div>
                                                <button
                                                    onClick={() => setIncludeIncome(!includeIncome)}
                                                    className={cn(
                                                        "relative w-9 h-5 rounded-full transition-colors",
                                                        includeIncome
                                                            ? "[background-color:var(--color-accent-primary)]"
                                                            : "bg-gray-300 dark:bg-gray-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "absolute top-0.5 left-0.5 w-4 h-4 keep-white rounded-full shadow transition-transform",
                                                            includeIncome && "translate-x-4"
                                                        )}
                                                    />
                                                </button>
                                            </div>

                                            {/* Transfer Toggle */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <List className="w-3.5 h-3.5" />
                                                    <span>Include Transfer</span>
                                                </div>
                                                <button
                                                    onClick={() => setIncludeTransfer(!includeTransfer)}
                                                    className={cn(
                                                        "relative w-9 h-5 rounded-full transition-colors",
                                                        includeTransfer
                                                            ? "[background-color:var(--color-accent-primary)]"
                                                            : "bg-gray-300 dark:bg-gray-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "absolute top-0.5 left-0.5 w-4 h-4 keep-white rounded-full shadow transition-transform",
                                                            includeTransfer && "translate-x-4"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Clear Filters Footer */}
                                        {activeFilterCount > 0 && (
                                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAccountId('all');
                                                        setIncludeInvestments(false);
                                                        setIncludeIncome(false);
                                                        setIncludeTransfer(false);
                                                    }}
                                                    className="w-full text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                                                >
                                                    Clear all filters
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAddPanel(true)}
                                className={cn("p-2 rounded-lg transition-all [background-color:var(--color-accent-primary)] text-[color:var(--color-text-inverse)] hover:[background-color:var(--color-accent-hover)]")}
                                title="Add Category"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Time Selector - Always visible */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <button
                            onClick={() => setViewMode('month')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === 'month'
                                    ? "bg-[color:var(--color-card-bg)] text-[color:var(--color-text-primary)] shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setViewMode('prevMonth')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === 'prevMonth'
                                    ? "bg-[color:var(--color-card-bg)] text-[color:var(--color-text-primary)] shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Prev Month
                        </button>
                        <button
                            onClick={() => setViewMode('year')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === 'year'
                                    ? "bg-[color:var(--color-card-bg)] text-[color:var(--color-text-primary)] shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            This Year
                        </button>
                        <button
                            onClick={() => setViewMode('prevYear')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === 'prevYear'
                                    ? "bg-[color:var(--color-card-bg)] text-[color:var(--color-text-primary)] shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Prev Year
                        </button>
                    </div>


                    {/* Active Filter Chips - Always show when filters are active */}
                    {activeFilterCount > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedAccountId !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    <Building2 className="w-3 h-3" />
                                    {getAccountName(selectedAccountId)}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedAccountId('all'); }}
                                        className="ml-0.5 hover:opacity-70"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {includeInvestments && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    <TrendingUp className="w-3 h-3" />
                                    + Investments
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIncludeInvestments(false); }}
                                        className="ml-0.5 hover:opacity-70"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {includeIncome && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    <Wallet className="w-3 h-3" />
                                    + Income
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIncludeIncome(false); }}
                                        className="ml-0.5 hover:opacity-70"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {includeTransfer && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    <List className="w-3 h-3" />
                                    + Transfer
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIncludeTransfer(false); }}
                                        className="ml-0.5 hover:opacity-70"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <CategoryList
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={handleCategorySelect}
                        spendingByCategory={expenseSpending}
                        investmentSpending={investmentSpending}
                        incomeSpending={incomeSpending}
                        transferSpending={transferSpending}
                        monthlyBudget={monthlyBudget}
                        viewMode={viewMode}
                        includeTransfer={includeTransfer}
                        includeInvestments={includeInvestments}
                        includeIncome={includeIncome}
                    />
                </div>

                {/* Add Category Side Overlay */}
                <SidePanel
                    isOpen={showAddPanel}
                    onClose={() => setShowAddPanel(false)}
                    title="Add New Category"
                    headerActions={(
                        <button
                            onClick={() => formRef.current?.submit()}
                            className="btn-primary text-sm"
                        >
                            Add
                        </button>
                    )}
                >
                    <div id="category-form-modal" onClick={(e) => e.stopPropagation()}>
                        <CategoryForm
                            ref={formRef}
                            categories={categories}
                            onSave={async (data) => {
                                try {
                                    await addCategory({
                                        name: data.name || 'New Category',
                                        color: data.color || '#3B82F6',
                                        icon: data.icon || '📁',
                                        isCustom: true,
                                        parentId: data.parentId,
                                        order: (categories.length ? Math.max(...categories.map(c => c.order || 0)) : 0) + 10,
                                        budget: data.budget
                                    });
                                    setShowAddPanel(false);
                                } catch (err) {
                                    console.error('Failed to add category', err);
                                    alert('Failed to add category');
                                }
                            }}
                            onCancel={() => setShowAddPanel(false)}
                        />
                    </div>
                </SidePanel>
            </div>

            {/* RIGHT PANE: Detail View */}
            <div className={cn(
                "flex-1 basis-0 theme-bg-primary flex flex-col min-w-0 overflow-x-hidden transition-all duration-300",
                !selectedCategoryId ? "hidden md:flex" : "flex"
            )}>
                {selectedCategory ? (
                    <div className="h-full flex flex-col overflow-hidden">
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

                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            <CategoryDetail
                                category={selectedCategory}
                                transactions={categoryTransactions}
                                chartTransactions={categoryChartTransactions}
                                monthlyBudget={monthlyBudget}
                                currentMonth={currentMonth}
                                viewMode={viewMode}
                                onUpdateTransaction={handleCategoryDetailUpdate}
                            />
                        </div>
                    </div>
                ) : (
                    <CategoryOverview
                        categories={categories}
                        monthlyBudget={monthlyBudget}
                        transactions={filteredTransactions}
                    />
                )}
            </div>

        </div>
    );
};

export default Categories;
