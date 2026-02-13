import React, { useState, useEffect, useMemo } from 'react';
import { Filter, LayoutGrid, List } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import Calendar from '../components/common/Calendar';
import TransactionListOverlay from '../components/transactions/TransactionListOverlay';
import { Transaction } from '../types';

interface CalendarEvent {
  id: string;
  title: string;
  amount: number;
  type: 'transaction' | 'recurring' | 'bill';
  category?: string;
  date: Date;
  isCompleted?: boolean;
  isPaid?: boolean;
  isOverdue?: boolean;
  originalData: any;
}

const CalendarPage: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions, recurringTransactions, bills, categories, deleteTransaction, updateTransaction, loadRecurringTransactions, loadBills, userProfile } = useData();
  const defaultTimePeriod = userProfile?.displayPreferences?.defaultTimePeriod || 'current';
  const defaultMonth = useMemo(() => {
    const date = new Date();
    if (defaultTimePeriod === 'previous') {
      date.setMonth(date.getMonth() - 1);
    }
    return date;
  }, [defaultTimePeriod]);

  useEffect(() => {
    loadRecurringTransactions();
    loadBills();
  }, []);

  const [showFilters, setShowFilters] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'chip' | 'icon'>('chip');
  const [filters, setFilters] = useState({
    showTransactions: true,
    showRecurring: true,
    showBills: true,
    transactionType: 'all' as 'all' | 'income' | 'expense' | 'investment',
    selectedCategories: [] as string[]
  });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedDateTransactions, setSelectedDateTransactions] = useState<Transaction[]>([]);
  const [modalTitle, setModalTitle] = useState('');


  // Filter transactions based on current filters
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by transaction type
    if (filters.transactionType !== 'all' && transaction.type !== filters.transactionType) {
      return false;
    }

    // Filter by selected categories
    if (filters.selectedCategories.length > 0 && !filters.selectedCategories.includes(transaction.category)) {
      return false;
    }

    return true;
  });

  // Filter recurring transactions by category
  const filteredRecurring = recurringTransactions.filter(recurring => {
    if (filters.selectedCategories.length > 0 && !filters.selectedCategories.includes(recurring.category)) {
      return false;
    }
    return true;
  });

  // Filter bills by category
  const filteredBills = bills.filter(bill => {
    if (filters.selectedCategories.length > 0 && !filters.selectedCategories.includes(bill.category || '')) {
      return false;
    }
    return true;
  });

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'transaction') {
      // Show transaction details or open edit modal
      console.log('Transaction clicked:', event.originalData);
    } else if (event.type === 'recurring') {
      // Navigate to recurring transactions or show details
      console.log('Recurring transaction clicked:', event.originalData);
    } else if (event.type === 'bill') {
      // Show bill details or mark as paid
      console.log('Bill clicked:', event.originalData);
    }
  };

  const handleDateClick = (date: Date) => {
    // Show all transactions for the selected date
    const dateTransactions = filteredTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.toDateString() === date.toDateString();
    });

    if (dateTransactions.length > 0) {
      setSelectedDateTransactions(dateTransactions);
      setModalTitle(`Transactions for ${date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
      setShowTransactionModal(true);
    }
  };



  // Filter categories by search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Calendar</h1>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <span className={cn(theme.textMuted, 'text-sm')}>Total Transactions:</span>
              <span className={cn(theme.textPrimary, 'text-sm font-semibold')}>{filteredTransactions.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(theme.textMuted, 'text-sm')}>Active Recurring:</span>
              <span className={cn(theme.textPrimary, 'text-sm font-semibold')}>{filteredRecurring.filter(rt => rt.isActive).length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 relative">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chip')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'chip'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
              title="Chip view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('icon')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'icon'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
              title="Icon view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                theme.btnSecondary,
                'flex items-center',
                showFilters && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              )}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(filters.selectedCategories.length > 0 ||
                filters.transactionType !== 'all' ||
                !filters.showTransactions ||
                !filters.showRecurring ||
                !filters.showBills) && (
                  <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
            </button>

            {/* Filter Popover */}
            {showFilters && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilters(false)}
                />

                {/* Popover Content */}
                <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className={cn(theme.textPrimary, 'font-semibold')}>Filters</h3>
                      <button
                        onClick={() => {
                          setFilters({
                            showTransactions: true,
                            showRecurring: true,
                            showBills: true,
                            transactionType: 'all',
                            selectedCategories: []
                          });
                          setCategorySearchQuery('');
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Reset All
                      </button>
                    </div>

                    {/* Display Type Filters */}
                    <div>
                      <label className={cn(theme.textSecondary, 'block text-xs font-medium mb-2')}>Display</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, showTransactions: !prev.showTransactions }))}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            filters.showTransactions
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          )}
                        >
                          Transactions
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, showRecurring: !prev.showRecurring }))}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            filters.showRecurring
                              ? 'bg-purple-500 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          )}
                        >
                          Recurring
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, showBills: !prev.showBills }))}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            filters.showBills
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          )}
                        >
                          Bills
                        </button>
                      </div>
                    </div>

                    {/* Transaction Type Filter */}
                    <div>
                      <label className={cn(theme.textSecondary, 'block text-xs font-medium mb-2')}>Transaction Type</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'income', label: 'Income' },
                          { value: 'expense', label: 'Expense' },
                          { value: 'investment', label: 'Investment' }
                        ].map(type => (
                          <button
                            key={type.value}
                            onClick={() => setFilters(prev => ({ ...prev, transactionType: type.value as any }))}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                              filters.transactionType === type.value
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            )}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={cn(theme.textSecondary, 'text-xs font-medium')}>
                          Categories {filters.selectedCategories.length > 0 && `(${filters.selectedCategories.length})`}
                        </label>
                        {filters.selectedCategories.length > 0 && (
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, selectedCategories: [] }))}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Search Input */}
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className={cn(
                          theme.input,
                          'text-sm py-2 mb-2'
                        )}
                      />

                      {/* Category List */}
                      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map(category => {
                            const isSelected = filters.selectedCategories.includes(category.id);
                            return (
                              <button
                                key={category.id}
                                onClick={() => {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedCategories: isSelected
                                      ? prev.selectedCategories.filter(id => id !== category.id)
                                      : [...prev.selectedCategories, category.id]
                                  }));
                                }}
                                className={cn(
                                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0',
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                )}
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                                  style={{ backgroundColor: `${category.color}20` }}
                                >
                                  {category.icon}
                                </div>
                                <span className={cn(theme.textPrimary, 'flex-1 text-left font-medium')}>
                                  {category.name}
                                </span>
                                {isSelected && (
                                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No categories found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {defaultTimePeriod === 'previous' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Defaulting to previous month based on your settings.
        </p>
      )}

      {/* Calendar */}
      <Calendar
        key={defaultMonth.toISOString().slice(0, 7)}
        transactions={filteredTransactions}
        recurringTransactions={filteredRecurring}
        bills={filteredBills}
        categories={categories}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        showTransactions={filters.showTransactions}
        showRecurring={filters.showRecurring}
        showBills={filters.showBills}
        viewMode={viewMode}
        defaultMonth={defaultMonth}
      />

      {/* Transaction List Overlay */}
      <TransactionListOverlay
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title={modalTitle}
        subtitle=""
        transactions={selectedDateTransactions}
        onTransactionClick={(transaction) => {
          // Placeholder for detail view
          console.log('View detail:', transaction);
        }}
        onDeleteTransaction={(transactionId) => {
          if (window.confirm('Are you sure you want to delete this transaction?')) {
            deleteTransaction(transactionId);
          }
        }}
        onUpdateTransaction={(transactionId, updates) => {
          updateTransaction(transactionId, updates);
        }}
      />
    </div>
  );
};

export default CalendarPage;