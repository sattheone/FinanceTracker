import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import CategoryList from '../components/categories/CategoryList';
import CategoryDetail from '../components/categories/CategoryDetail';
import CategoryOverview from '../components/categories/CategoryOverview';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import { X, ChevronDown, Filter, Calendar, Building2, TrendingUp, Plus, List, Layers } from 'lucide-react';
import SidePanel from '../components/common/SidePanel';
import CategoryForm, { CategoryFormHandle } from '../components/categories/CategoryForm';

const Categories: React.FC = () => {
    const { categories, transactions, monthlyBudget, bankAccounts } = useData();
    const theme = useThemeClasses();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
    const [includeInvestments, setIncludeInvestments] = useState(false);
    const [categoryDisplayMode, setCategoryDisplayMode] = useState<'flat' | 'grouped'>('flat');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<CategoryFormHandle | null>(null);

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

    // Filter transactions by account first
    const filteredTransactions = useMemo(() => {
        if (selectedAccountId === 'all') return transactions;
        return transactions.filter(t => t.bankAccountId === selectedAccountId);
    }, [transactions, selectedAccountId]);

    // --- 1. Aggregation for List View ---
    const currentMonth = useMemo(() => new Date(), []);

    const { expenseSpending, investmentSpending } = useMemo(() => {
        const expenses: Record<string, number> = {};
        const investments: Record<string, number> = {};

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        const currentYearKey = `${now.getFullYear()}`;

        filteredTransactions.forEach(t => {
            const tDate = new Date(t.date);
            let isMatch = false;

            if (viewMode === 'month') {
                const tMonthKey = `${tDate.getFullYear()}-${tDate.getMonth()}`;
                if (tMonthKey === currentMonthKey) isMatch = true;
            } else {
                const tYearKey = `${tDate.getFullYear()}`;
                if (tYearKey === currentYearKey) isMatch = true;
            }

            if (isMatch) {
                if (t.type === 'expense') {
                    expenses[t.category] = (expenses[t.category] || 0) + t.amount;
                } else if (t.type === 'investment') {
                    investments[t.category] = (investments[t.category] || 0) + t.amount;
                }
            }
        });
        return { expenseSpending: expenses, investmentSpending: investments };
    }, [filteredTransactions, viewMode]);

    // --- 2. Selection Handling ---

    const handleCategorySelect = (id: string) => {
        setSelectedCategoryId(id);
    };

    const selectedCategory = useMemo(() =>
        categories.find(c => c.id === selectedCategoryId),
        [categories, selectedCategoryId]);

    const categoryTransactions = useMemo(() =>
        filteredTransactions.filter(t => t.category === selectedCategoryId),
        [filteredTransactions, selectedCategoryId]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedAccountId !== 'all') count++;
        if (includeInvestments) count++;
        return count;
    }, [selectedAccountId, includeInvestments]);

    // Get account display name with last 4 digits
    const getAccountName = (accountId: string) => {
        if (accountId === 'all') return 'All Accounts';
        const account = bankAccounts.find(a => a.id === accountId);
        if (!account) return 'Unknown';
        const last4 = account.number?.slice(-4);
        return last4 ? `${account.bank} ••${last4}` : account.bank;
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex bg-white dark:bg-gray-900 overflow-hidden -m-4 lg:-m-6">

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
                                    </div>

                                    {/* Clear Filters Footer */}
                                    {activeFilterCount > 0 && (
                                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={() => {
                                                    setSelectedAccountId('all');
                                                    setIncludeInvestments(false);
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
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'month'
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            This Month
                        </button>
                        <button
                            onClick={() => setViewMode('year')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'year'
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            This Year
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
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <CategoryList
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={handleCategorySelect}
                        spendingByCategory={expenseSpending}
                        investmentSpending={includeInvestments ? investmentSpending : undefined}
                        monthlyBudget={monthlyBudget}
                        displayMode={categoryDisplayMode}
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
                            onSave={() => setShowAddPanel(false)}
                            onCancel={() => setShowAddPanel(false)}
                        />
                    </div>
                </SidePanel>
            </div>

            {/* RIGHT PANE: Detail View */}
            <div className={cn(
                "flex-1 bg-white dark:bg-gray-900 flex flex-col min-w-0 transition-all duration-300",
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
