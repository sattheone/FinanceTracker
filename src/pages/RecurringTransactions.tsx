import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, ArrowRight, Trash2, Edit3, Repeat } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { RecurringTransaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import RecurringSetupModal from '../components/transactions/RecurringSetupModal';
import InlineCategoryEditor from '../components/transactions/InlineCategoryEditor';

const RecurringTransactions: React.FC = () => {
  const { recurringTransactions, transactions, updateRecurringTransaction, deleteRecurringTransaction } = useData();
  const theme = useThemeClasses();
  const [viewMode, setViewMode] = useState<'overview' | 'all'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Helper to check if paid this month
  const getPaymentStatus = (recurring: RecurringTransaction) => {
    // Find a transaction linked to this recurring item in the current month
    // OR matching description/amount if not explicitly linked (fallback)
    const linkedTxn = transactions.find(t =>
      t.recurringTransactionId === recurring.id &&
      new Date(t.date).getMonth() === currentMonth &&
      new Date(t.date).getFullYear() === currentYear
    );

    if (linkedTxn) return { status: 'paid', date: linkedTxn.date };

    // Check due date
    const dueDate = new Date(recurring.nextDueDate);
    const isDueThisMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;

    if (isDueThisMonth) {
      if (dueDate < new Date()) return { status: 'overdue', date: recurring.nextDueDate };
      return { status: 'upcoming', date: recurring.nextDueDate };
    }

    return { status: 'future', date: recurring.nextDueDate };
  };

  const { thisMonthItems, futureItems, summary } = useMemo(() => {
    const thisMonth: any[] = [];
    const future: any[] = [];
    let paidTotal = 0;
    let upcomingTotal = 0;

    recurringTransactions.forEach(rt => {
      if (!rt.isActive) return;

      const { status, date } = getPaymentStatus(rt);
      const item = { ...rt, status, displayDate: date };

      if (status === 'paid' || status === 'upcoming' || status === 'overdue') {
        thisMonth.push(item);
        if (status === 'paid') {
          paidTotal += rt.amount;
        } else {
          upcomingTotal += rt.amount;
        }
      } else {
        future.push(item);
      }
    });

    // Sort by date
    thisMonth.sort((a, b) => new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime());
    future.sort((a, b) => new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime());

    return {
      thisMonthItems: thisMonth,
      futureItems: future,
      summary: { paid: paidTotal, left: upcomingTotal }
    };
  }, [recurringTransactions, transactions]);

  const handleEdit = (recurring: RecurringTransaction) => {
    setEditingRecurring(recurring);
    setShowForm(true);
  };

  const handleSaveRecurring = async (settings: { frequency: string; interval: number; startDate: string }) => {
    if (editingRecurring) {
      await updateRecurringTransaction(editingRecurring.id, {
        frequency: settings.frequency as any,
        interval: settings.interval,
        startDate: settings.startDate,
        nextDueDate: settings.startDate,
      });
      setEditingRecurring(null);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecurringTransaction(id);
    setEditingRecurring(null);
    setShowForm(false);
  };

  const handleCategoryChange = async (recurring: RecurringTransaction, categoryId: string) => {
    await updateRecurringTransaction(recurring.id, { category: categoryId });
  };

  const getFrequencyText = (rt: RecurringTransaction) => {
    if (rt.interval && rt.interval > 1) {
      return `Every ${rt.interval} ${rt.frequency === 'monthly' ? 'months' : rt.frequency === 'weekly' ? 'weeks' : 'years'}`;
    }
    return rt.frequency.charAt(0).toUpperCase() + rt.frequency.slice(1);
  };

  const renderListItem = (item: any) => (
    <div
      key={item.id}
      className={cn(
        theme.card,
        'flex items-center p-4 hover:shadow-md transition-all group gap-4'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg',
        item.status === 'paid' ? 'bg-green-100 text-green-600' :
          item.status === 'overdue' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-600'
      )}>
        {item.status === 'paid' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={cn(theme.textPrimary, 'font-medium truncate')}>{item.name}</h3>
        <p className={cn(theme.textMuted, 'text-sm truncate')}>
          {formatDate(item.displayDate)} • {getFrequencyText(item)}
        </p>
      </div>

      <div className="hidden sm:block w-48">
        <InlineCategoryEditor
          currentCategory={item.category || 'other'}
          onSave={(categoryId) => handleCategoryChange(item, categoryId)}
        />
      </div>

      <div className="text-right">
        <p className={cn(theme.textPrimary, 'font-bold')}>{formatCurrency(item.amount)}</p>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1',
          item.status === 'paid' ? 'bg-green-100 text-green-700' :
            item.status === 'overdue' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
        )}>
          {item.status === 'paid' ? 'Paid' : item.status === 'overdue' ? 'Overdue' : 'Upcoming'}
        </span>
      </div>

      <div className="flex items-center space-x-1 pl-2 border-l border-gray-200 dark:border-gray-700 ml-2">
        <button
          onClick={() => handleEdit(item)}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to stop this recurring transaction?')) {
              handleDelete(item.id);
            }
          }}
          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Simplified list render for 'All' view
  const renderAllItem = (item: RecurringTransaction) => (
    <div
      key={item.id}
      className={cn(
        theme.card,
        'flex items-center p-4 hover:shadow-md transition-all group gap-4'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg',
        item.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
      )}>
        <Repeat className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={cn(theme.textPrimary, 'font-medium truncate')}>{item.name}</h3>
        <p className={cn(theme.textMuted, 'text-sm truncate')}>
          {getFrequencyText(item)} • Next: {formatDate(item.nextDueDate)}
        </p>
      </div>

      <div className="hidden sm:block w-48">
        <InlineCategoryEditor
          currentCategory={item.category || 'other'}
          onSave={(categoryId) => handleCategoryChange(item, categoryId)}
        />
      </div>

      <div className="text-right">
        <p className={cn(theme.textPrimary, 'font-bold')}>{formatCurrency(item.amount)}</p>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1',
          item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        )}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="flex items-center space-x-1 pl-2 border-l border-gray-200 dark:border-gray-700 ml-2">
        <button
          onClick={() => handleEdit(item)}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(item.id)}
          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header & Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={theme.heading1}>Recurring</h1>
          <p className={theme.textSecondary}>Track your subscriptions and bills</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('overview')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              viewMode === 'overview'
                ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              viewMode === 'all'
                ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
            )}
          >
            View All Rules
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className={cn(theme.card, 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800')}>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Paid this Month</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(summary.paid)}</p>
            </div>
            <div className={cn(theme.card, 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800')}>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Left to Pay</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(summary.left)}</p>
            </div>
          </div>

          {/* This Month Section */}
          <div>
            <h2 className={cn(theme.heading3, 'mb-4 flex items-center')}>
              <Calendar className="w-5 h-5 mr-2 text-gray-500" />
              This Month
            </h2>
            <div className="space-y-3">
              {thisMonthItems.length === 0 ? (
                <p className={theme.textMuted}>No recurring payments due this month.</p>
              ) : (
                thisMonthItems.map(renderListItem)
              )}
            </div>
          </div>

          {/* Future Section */}
          <div>
            <h2 className={cn(theme.heading3, 'mb-4 flex items-center')}>
              <ArrowRight className="w-5 h-5 mr-2 text-gray-500" />
              Future
            </h2>
            <div className="space-y-3">
              {futureItems.length === 0 ? (
                <p className={theme.textMuted}>No upcoming future payments.</p>
              ) : (
                futureItems.map(renderListItem)
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {recurringTransactions.length === 0 ? (
            <p className={theme.textMuted}>No recurring rules defined.</p>
          ) : (
            recurringTransactions.map(renderAllItem)
          )}
        </div>
      )}

      {/* Edit Modal */}
      <RecurringSetupModal
        recurringTransaction={editingRecurring || undefined}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRecurring(null);
        }}
        onSave={handleSaveRecurring}
        onDelete={() => editingRecurring && handleDelete(editingRecurring.id)}
      />
    </div>
  );
};

export default RecurringTransactions;