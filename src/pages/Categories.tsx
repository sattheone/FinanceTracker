import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import CategoryList from '../components/categories/CategoryList';
import CategoryDetail from '../components/categories/CategoryDetail';
import CategoryOverview from '../components/categories/CategoryOverview';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import { X, ChevronDown, Filter, Building2, TrendingUp, Plus, List, Layers } from 'lucide-react';
import SidePanel from '../components/common/SidePanel';
import CategoryForm, { CategoryFormHandle } from '../components/categories/CategoryForm';
import { getOptimizedCategorySummariesByMonth, getOptimizedCategorySummariesByYear } from '../services/categorySummaryService';
import { FirebaseService } from '../services/firebaseService';
import { Transaction } from '../types';

// Module-level cache: survives component unmount/remount across navigations
const yearCategoryCache = new Map<string, Transaction[]>();

const Categories: React.FC = () => {
    const { categories, transactions, monthlyBudget, bankAccounts, addCategory, loadTransactionsForPeriod, userProfile, updateTransaction, categorySummaryVersion } = useData();
    const { user } = useAuth();
    const theme = useThemeClasses();
    const [searchParams] = useSearchParams();


    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const defaultViewMode: 'month' | 'prevMonth' =
        userProfile?.displayPreferences?.defaultTimePeriod === 'previous' ? 'prevMonth' : 'month';
    const [viewMode, setViewMode] = useState<'month' | 'prevMonth' | 'year' | 'prevYear'>(defaultViewMode);
    const [includeInvestments, setIncludeInvestments] = useState(false);
    const [includeTransfer, setIncludeTransfer] = useState(false);
    const [categoryDisplayMode, setCategoryDisplayMode] = useState<'flat' | 'grouped'>('flat');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<CategoryFormHandle | null>(null);
    
    // Category summaries state for sidebar
    const [categorySummaries, setCategorySummaries] = useState<Map<string, number>>(new Map());
    const [_isSummariesLoading, setIsSummariesLoading] = useState(true);

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

    // Removed auto-loading of transactions when category is selected
    // Transactions from cache are used instead. User can manually load more if needed.

    // Load transactions only for the currently viewed period
    // For 'month' and 'prevMonth': load just that single month
    // For 'year' and 'prevYear': DON'T bulk-load all 12 months upfront (too many reads!)
    //   Instead, rely on categorySummaries for sidebar totals, and only load
    //   transactions on-demand when a category is selected
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
        }
        // For 'year' and 'prevYear', we skip bulk loading here.
        // The sidebar uses categorySummaries (optimized, ~12 reads).
        // Transactions for category detail are loaded on-demand below.
    }, [viewMode]);

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

    // Load category summaries for sidebar based on view mode (using optimized structure)
    const summaryRefreshTrigger = (viewMode === 'year' || viewMode === 'prevYear') ? categorySummaryVersion : 0;

    useEffect(() => {
        if (!user?.id) return;
        
        setIsSummariesLoading(true);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-based for summaries
        
        let loadPromise: Promise<Map<string, number>>;
        
        if (viewMode === 'month') {
            // 1 read only
            loadPromise = getOptimizedCategorySummariesByMonth(user.id, year, month);
        } else if (viewMode === 'prevMonth') {
            // 1 read only - previous month
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            loadPromise = getOptimizedCategorySummariesByMonth(user.id, prevYear, prevMonth);
        } else if (viewMode === 'year') {
            // 12 reads max
            loadPromise = getOptimizedCategorySummariesByYear(user.id, year);
        } else { // prevYear
            // 12 reads max
            loadPromise = getOptimizedCategorySummariesByYear(user.id, year - 1);
        }
        
        loadPromise
            .then(summaries => {
                setCategorySummaries(summaries);
                setIsSummariesLoading(false);
            })
            .catch(err => {
                console.error('Failed to load category summaries:', err);
                setIsSummariesLoading(false);
            });
    }, [user?.id, viewMode, summaryRefreshTrigger]);

    // Filter transactions by account first (only used when category is selected)
    const filteredTransactions = useMemo(() => {
        if (selectedAccountId === 'all') return transactions;
        return transactions.filter(t => t.bankAccountId === selectedAccountId);
    }, [transactions, selectedAccountId]);

    // --- 1. Convert summaries to spending records for CategoryList ---
    const currentMonth = useMemo(() => new Date(), []);

    const { expenseSpending, investmentSpending } = useMemo(() => {
        const expenses: Record<string, number> = {};
        const investments: Record<string, number> = {};
        
        // For year/prevYear views, use pre-aggregated categorySummaries (from Firestore)
        // to avoid loading all individual transactions (saves hundreds of reads)
        if ((viewMode === 'year' || viewMode === 'prevYear') && categorySummaries.size > 0) {
            categorySummaries.forEach((amount, categoryId) => {
                expenses[categoryId] = amount;
            });
            return { expenseSpending: expenses, investmentSpending: investments };
        }
        
        // For month/prevMonth views, calculate from local transactions for real-time updates
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
                // Previous month
                const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
                const prevMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
                return txYear === prevMonthYear && txMonth === prevMonth;
            } else if (viewMode === 'year') {
                return txYear === currentYear;
            } else { // prevYear
                return txYear === currentYear - 1;
            }
        });
        
        // Calculate spending by category and type
        relevantTransactions.forEach(t => {
            const categoryId = t.category || 'uncategorized';
            const amount = t.amount || 0;
            
            if (t.type === 'investment') {
                investments[categoryId] = (investments[categoryId] || 0) + amount;
            } else if (t.type === 'expense' || t.type === 'transfer') {
                // Include transfer in expenses for consistency with CategoryOverview
                expenses[categoryId] = (expenses[categoryId] || 0) + amount;
            }
            // Income is not included in spending
        });
        
        return { expenseSpending: expenses, investmentSpending: investments };
    }, [filteredTransactions, viewMode, categorySummaries]);

    // --- 2. Selection Handling ---

    const handleCategorySelect = (id: string) => {
        setSelectedCategoryId(id);
    };

    // On-demand: fetch only the selected category's transactions for year/prevYear view
    // Uses a category-specific Firestore query (reads only matching docs, not all transactions)
    const [_isLoadingCategoryTransactions, setIsLoadingCategoryTransactions] = useState(false);
    const [yearCategoryTransactions, setYearCategoryTransactions] = useState<Transaction[]>([]);
    
    useEffect(() => {
        if (!selectedCategoryId || !user?.id) {
            setYearCategoryTransactions([]);
            return;
        }
        if (viewMode !== 'year' && viewMode !== 'prevYear') {
            setYearCategoryTransactions([]);
            return;
        }
        
        const now = new Date();
        const targetYear = viewMode === 'prevYear' ? now.getFullYear() - 1 : now.getFullYear();
        const cacheKey = `${viewMode}:${selectedCategoryId}`;
        
        // Check module-level cache first (persists across navigations)
        if (yearCategoryCache.has(cacheKey)) {
            setYearCategoryTransactions(yearCategoryCache.get(cacheKey)!);
            return;
        }
        
        const startDate = new Date(targetYear, 0, 1);
        const endDate = new Date(targetYear, 11, 31, 23, 59, 59);
        
        setIsLoadingCategoryTransactions(true);
        FirebaseService.getTransactionsByCategoryAndDateRange(
            user.id,
            selectedCategoryId,
            startDate.toISOString(),
            endDate.toISOString()
        )
            .then(txns => {
                yearCategoryCache.set(cacheKey, txns);
                setYearCategoryTransactions(txns);
            })
            .catch(err => {
                console.warn('Category query failed (index may be building), falling back to in-memory filter:', err);
                // Fallback: filter from whatever transactions are already in memory
                const fallback = transactions.filter(t => {
                    if (t.category !== selectedCategoryId) return false;
                    const txDate = new Date(t.date);
                    return txDate.getFullYear() === targetYear;
                });
                setYearCategoryTransactions(fallback);
            })
            .finally(() => setIsLoadingCategoryTransactions(false));
    }, [selectedCategoryId, viewMode, user?.id, categorySummaryVersion]);

    const selectedCategory = useMemo(() =>
        categories.find(c => c.id === selectedCategoryId),
        [categories, selectedCategoryId]);

    // For month/prevMonth: filter from in-memory transactions
    // For year/prevYear: use directly fetched category transactions
    const categoryTransactions = useMemo(() => {
        if ((viewMode === 'year' || viewMode === 'prevYear') && yearCategoryTransactions.length > 0) {
            if (selectedAccountId === 'all') return yearCategoryTransactions;
            return yearCategoryTransactions.filter(t => t.bankAccountId === selectedAccountId);
        }
        return filteredTransactions.filter(t => t.category === selectedCategoryId);
    }, [filteredTransactions, selectedCategoryId, viewMode, yearCategoryTransactions, selectedAccountId]);

    const applySummaryDelta = (oldTx: Transaction, newTx: Transaction) => {
        setCategorySummaries(prev => {
            if (prev.size === 0) return prev;

            const next = new Map(prev);
            const oldCategoryId = oldTx.category || 'uncategorized';
            const newCategoryId = newTx.category || oldCategoryId;
            const oldAmount = Number(oldTx.amount || 0);
            const newAmount = Number(newTx.amount ?? oldAmount);

            if (oldCategoryId !== newCategoryId) {
                next.set(oldCategoryId, (next.get(oldCategoryId) || 0) - oldAmount);
                next.set(newCategoryId, (next.get(newCategoryId) || 0) + newAmount);
            } else if (oldAmount !== newAmount) {
                next.set(oldCategoryId, (next.get(oldCategoryId) || 0) + (newAmount - oldAmount));
            }

            return next;
        });
    };

    const handleCategoryDetailUpdate = async (transactionId: string, updates: Partial<Transaction>) => {
        const currentTransaction = categoryTransactions.find(t => t.id === transactionId);
        if (!currentTransaction) {
            await updateTransaction(transactionId, updates);
            return;
        }

        const isYearView = viewMode === 'year' || viewMode === 'prevYear';
        const optimisticTransaction: Transaction = { ...currentTransaction, ...updates };

        if (isYearView) {
            setYearCategoryTransactions(prev => {
                if (!prev.some(t => t.id === transactionId)) return prev;

                const movedOutOfSelectedCategory =
                    !!selectedCategoryId && optimisticTransaction.category !== selectedCategoryId;

                if (movedOutOfSelectedCategory) {
                    return prev.filter(t => t.id !== transactionId);
                }

                return prev.map(t => (t.id === transactionId ? optimisticTransaction : t));
            });

            applySummaryDelta(currentTransaction, optimisticTransaction);
        }

        try {
            await updateTransaction(transactionId, updates);
        } catch (error) {
            if (isYearView) {
                setYearCategoryTransactions(prev => {
                    const alreadyPresent = prev.some(t => t.id === transactionId);
                    if (alreadyPresent) {
                        return prev.map(t => (t.id === transactionId ? currentTransaction : t));
                    }
                    return [currentTransaction, ...prev];
                });

                applySummaryDelta(optimisticTransaction, currentTransaction);
            }
            throw error;
        }
    };

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedAccountId !== 'all') count++;
        if (includeInvestments) count++;
        if (includeTransfer) count++;
        return count;
    }, [selectedAccountId, includeInvestments, includeTransfer]);

    // Get account display name with last 4 digits
    const getAccountName = (accountId: string) => {
        if (accountId === 'all') return 'All Accounts';
        const account = bankAccounts.find(a => a.id === accountId);
        if (!account) return 'Unknown';
        const last4 = account.number?.slice(-4);
        return last4 ? `${account.bank} ••${last4}` : account.bank;
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex bg-white dark:bg-gray-900 overflow-hidden min-w-0">

            {/* LEFT PANE: Category List */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-visible",
                selectedCategoryId ? "hidden md:flex" : "flex"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 overflow-visible">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className={cn(theme.textPrimary, "text-xl font-bold")}>
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
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                {/* Popover Content */}
                                {showFilters && (
                                    <div className="fixed mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[100]"
                                        style={{
                                            top: filterRef.current?.getBoundingClientRect().bottom ?? 0,
                                            left: Math.max(16, (filterRef.current?.getBoundingClientRect().right ?? 0) - 288)
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
                                                        className="w-full appearance-none bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200 pl-2 pr-6 py-1.5 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
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
                                                            ? "bg-purple-600"
                                                            : "bg-gray-300 dark:bg-gray-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                                            includeInvestments && "translate-x-4"
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
                                                            ? "bg-blue-600"
                                                            : "bg-gray-300 dark:bg-gray-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
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
                            {/* Category Display Mode Toggle */}
                            <button
                                onClick={() => setCategoryDisplayMode(categoryDisplayMode === 'flat' ? 'grouped' : 'flat')}
                                className={cn(
                                    "relative p-2 rounded-lg transition-all",
                                    categoryDisplayMode === 'grouped'
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                                )}
                                title={categoryDisplayMode === 'grouped' ? 'Grouped View' : 'Individual View'}
                            >
                                {categoryDisplayMode === 'grouped' ? (
                                    <Layers className="w-4 h-4" />
                                ) : (
                                    <List className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={() => setShowAddPanel(true)}
                                className={cn("p-2 rounded-lg transition-all bg-black text-white hover:bg-gray-900")}
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
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'month'
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setViewMode('prevMonth')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'prevMonth'
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Prev Month
                        </button>
                        <button
                            onClick={() => setViewMode('year')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'year'
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            This Year
                        </button>
                        <button
                            onClick={() => setViewMode('prevYear')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'prevYear'
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
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
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium rounded-full">
                                    <Building2 className="w-3 h-3" />
                                    {getAccountName(selectedAccountId)}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedAccountId('all'); }}
                                        className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {includeInvestments && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-medium rounded-full">
                                    <TrendingUp className="w-3 h-3" />
                                    + Investments
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIncludeInvestments(false); }}
                                        className="ml-0.5 hover:text-purple-900 dark:hover:text-purple-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {includeTransfer && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium rounded-full">
                                    <List className="w-3 h-3" />
                                    + Transfer
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIncludeTransfer(false); }}
                                        className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-200"
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
                        monthlyBudget={monthlyBudget}
                        displayMode={categoryDisplayMode}
                        viewMode={viewMode}
                        includeTransfer={includeTransfer}
                        includeInvestments={includeInvestments}
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
                            className="px-4 py-1.5 bg-black text-white rounded-lg text-sm font-semibold shadow hover:bg-gray-900"
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
                "flex-1 basis-0 bg-white dark:bg-gray-900 flex flex-col min-w-0 overflow-x-hidden transition-all duration-300",
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
                                monthlyBudget={monthlyBudget}
                                currentMonth={currentMonth}
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
