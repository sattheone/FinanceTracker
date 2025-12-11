import React, { useState } from 'react';
import { Calendar as CalendarIcon, Filter, Download } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import Calendar from '../components/common/Calendar';
import TransactionListModal from '../components/transactions/TransactionListModal';
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
  const { transactions, recurringTransactions, bills } = useData();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    showTransactions: true,
    showRecurring: true,
    showBills: true,
    transactionType: 'all' as 'all' | 'income' | 'expense' | 'investment'
  });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedDateTransactions, setSelectedDateTransactions] = useState<Transaction[]>([]);
  const [modalTitle, setModalTitle] = useState('');

  // Filter transactions based on current filters
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.transactionType === 'all') return true;
    return transaction.type === filters.transactionType;
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

  const exportCalendarData = () => {
    // Export calendar data as CSV or PDF
    console.log('Exporting calendar data...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Calendar</h1>
            <p className="text-gray-600 dark:text-gray-300">
              View all your transactions, recurring payments, and bills in calendar format
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
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
          </button>
          
          <button
            onClick={exportCalendarData}
            className={cn(theme.btnSecondary, 'flex items-center')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <h3 className={cn(theme.textPrimary, 'font-semibold mb-4')}>Filter Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Show/Hide Options */}
            <div>
              <label className={cn(theme.textSecondary, 'block text-sm font-medium mb-2')}>Display</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showTransactions}
                    onChange={(e) => setFilters(prev => ({ ...prev, showTransactions: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className={theme.textPrimary}>Transactions</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showRecurring}
                    onChange={(e) => setFilters(prev => ({ ...prev, showRecurring: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className={theme.textPrimary}>Recurring</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showBills}
                    onChange={(e) => setFilters(prev => ({ ...prev, showBills: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className={theme.textPrimary}>Bills</span>
                </label>
              </div>
            </div>
            
            {/* Transaction Type Filter */}
            <div>
              <label className={cn(theme.textSecondary, 'block text-sm font-medium mb-2')}>Transaction Type</label>
              <select
                value={filters.transactionType}
                onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value as any }))}
                className={theme.select}
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
                <option value="investment">Investments Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className={cn(theme.textMuted, 'text-sm')}>Total Transactions</p>
              <p className={cn(theme.textPrimary, 'text-xl font-semibold')}>{filteredTransactions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className={cn(theme.textMuted, 'text-sm')}>Active Recurring</p>
              <p className={cn(theme.textPrimary, 'text-xl font-semibold')}>
                {recurringTransactions.filter(rt => rt.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className={cn(theme.textMuted, 'text-sm')}>Pending Bills</p>
              <p className={cn(theme.textPrimary, 'text-xl font-semibold')}>
                {bills.filter(bill => !bill.isPaid).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className={cn(theme.textMuted, 'text-sm')}>Overdue Bills</p>
              <p className={cn(theme.textPrimary, 'text-xl font-semibold')}>
                {bills.filter(bill => !bill.isPaid && new Date(bill.dueDate) < new Date()).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <Calendar
          transactions={filteredTransactions}
          recurringTransactions={recurringTransactions}
          bills={bills}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          showTransactions={filters.showTransactions}
          showRecurring={filters.showRecurring}
          showBills={filters.showBills}
          title="Financial Calendar"
        />
      </div>

      {/* Transaction List Modal */}
      <TransactionListModal
        transactions={selectedDateTransactions}
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title={modalTitle}
      />
    </div>
  );
};

export default CalendarPage;