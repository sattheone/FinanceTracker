import React, { useState } from 'react';
import { Plus, Calendar, Clock, DollarSign, Repeat, Bell, Tag, Edit3, Trash2, Play, Pause, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { RecurringTransaction, Bill } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import Modal from '../components/common/Modal';
import RecurringTransactionForm from '../components/forms/RecurringTransactionForm';
import BillForm from '../components/forms/BillForm';

const RecurringTransactions: React.FC = () => {
  const { 
    recurringTransactions, 
    bills, 
    updateRecurringTransaction, 
    deleteRecurringTransaction,
    deleteBill,
    markBillAsPaid,
    getUpcomingBills,
    getOverdueBills
  } = useData();
  
  const theme = useThemeClasses();
  const [activeTab, setActiveTab] = useState<'recurring' | 'bills' | 'calendar'>('recurring');
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const upcomingBills = getUpcomingBills(30); // Next 30 days
  const overdueBills = getOverdueBills();

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'monthly': return '🗓️';
      case 'quarterly': return '📊';
      case 'yearly': return '🎯';
      default: return '🔄';
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'weekly': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'monthly': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      case 'quarterly': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
      case 'yearly': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 dark:text-green-400';
      case 'expense': return 'text-red-600 dark:text-red-400';
      case 'investment': return 'text-blue-600 dark:text-blue-400';
      case 'insurance': return 'text-purple-600 dark:text-purple-400';
      default: return theme.textSecondary;
    }
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    await updateRecurringTransaction(id, { isActive: !isActive });
  };

  const handleEditRecurring = (recurring: RecurringTransaction) => {
    setEditingRecurring(recurring);
    setShowRecurringForm(true);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setShowBillForm(true);
  };

  const handleRecurringSubmit = () => {
    setShowRecurringForm(false);
    setEditingRecurring(null);
  };

  const handleBillSubmit = () => {
    setShowBillForm(false);
    setEditingBill(null);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={theme.heading1}>Recurring Transactions & Bills</h1>
        <p className={cn(theme.textSecondary, 'mt-1')}>
          Manage your recurring payments, subscriptions, and bill reminders
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={theme.card}>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Repeat className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className={cn(theme.textMuted, 'text-sm')}>Active Recurring</p>
              <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
                {recurringTransactions.filter(rt => rt.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className={theme.card}>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className={cn(theme.textMuted, 'text-sm')}>Upcoming Bills</p>
              <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
                {upcomingBills.length}
              </p>
            </div>
          </div>
        </div>

        <div className={theme.card}>
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className={cn(theme.textMuted, 'text-sm')}>Overdue Bills</p>
              <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
                {overdueBills.length}
              </p>
            </div>
          </div>
        </div>

        <div className={theme.card}>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className={cn(theme.textMuted, 'text-sm')}>Monthly Total</p>
              <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
                {formatCurrency(
                  recurringTransactions
                    .filter(rt => rt.isActive && rt.frequency === 'monthly')
                    .reduce((sum, rt) => sum + (rt.type === 'expense' ? rt.amount : -rt.amount), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {[
          { id: 'recurring', label: 'Recurring Transactions', icon: Repeat },
          { id: 'bills', label: 'Bills & Reminders', icon: Bell },
          { id: 'calendar', label: 'Calendar View', icon: Calendar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          {/* Add Button */}
          <div className="flex justify-between items-center">
            <h3 className={theme.heading3}>Recurring Transactions</h3>
            <button
              onClick={() => setShowRecurringForm(true)}
              className={cn(theme.btnPrimary, 'flex items-center')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring Transaction
            </button>
          </div>

          {/* Recurring Transactions List */}
          {recurringTransactions.length === 0 ? (
            <div className={cn(theme.card, 'text-center py-12')}>
              <Repeat className={cn(theme.textMuted, 'h-16 w-16 mx-auto mb-4')} />
              <h3 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>No recurring transactions yet</h3>
              <p className={cn(theme.textMuted, 'mb-4')}>
                Set up automatic tracking for your regular income and expenses like salary, rent, subscriptions, etc.
              </p>
              <button
                onClick={() => setShowRecurringForm(true)}
                className={theme.btnPrimary}
              >
                Add Your First Recurring Transaction
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringTransactions.map(recurring => (
                <div key={recurring.id} className={cn(theme.card, 'hover:shadow-md transition-shadow')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        'p-3 rounded-lg',
                        recurring.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                      )}>
                        <span className="text-2xl">{getFrequencyIcon(recurring.frequency)}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={cn(theme.textPrimary, 'font-semibold')}>{recurring.name}</h4>
                          <span className={cn(
                            'px-2 py-1 text-xs rounded-full font-medium',
                            getFrequencyColor(recurring.frequency)
                          )}>
                            {recurring.frequency}
                          </span>
                          {!recurring.isActive && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className={cn(theme.textSecondary, 'text-sm mb-2')}>{recurring.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={cn(theme.textMuted, 'flex items-center')}>
                            <Calendar className="w-4 h-4 mr-1" />
                            Next: {formatDate(recurring.nextDueDate)}
                          </span>
                          <span className={cn(theme.textMuted, 'flex items-center')}>
                            <Tag className="w-4 h-4 mr-1" />
                            {recurring.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={cn('text-lg font-bold', getTypeColor(recurring.type))}>
                          {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                        </p>
                        <p className={cn(theme.textMuted, 'text-sm')}>
                          {recurring.type}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleRecurring(recurring.id, recurring.isActive)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            recurring.isActive
                              ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                          title={recurring.isActive ? 'Pause' : 'Resume'}
                        >
                          {recurring.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleEditRecurring(recurring)}
                          className={cn(theme.interactive, 'p-2')}
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteRecurringTransaction(recurring.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* Add Button */}
          <div className="flex justify-between items-center">
            <h3 className={theme.heading3}>Bills & Reminders</h3>
            <button
              onClick={() => setShowBillForm(true)}
              className={cn(theme.btnPrimary, 'flex items-center')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </button>
          </div>

          {/* Overdue Bills Alert */}
          {overdueBills.length > 0 && (
            <div className={cn(theme.alertError, 'flex items-center')}>
              <AlertCircle className="w-5 h-5 mr-3" />
              <div>
                <p className="font-medium">You have {overdueBills.length} overdue bill(s)</p>
                <p className="text-sm opacity-90">Please review and mark them as paid if completed.</p>
              </div>
            </div>
          )}

          {/* Upcoming Bills */}
          {upcomingBills.length > 0 && (
            <div className={theme.card}>
              <h4 className={cn(theme.textPrimary, 'font-semibold mb-4')}>Upcoming Bills (Next 30 Days)</h4>
              <div className="space-y-3">
                {upcomingBills.slice(0, 5).map(bill => {
                  const daysUntil = getDaysUntilDue(bill.dueDate);
                  return (
                    <div key={bill.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div>
                        <p className={cn(theme.textPrimary, 'font-medium')}>{bill.name}</p>
                        <p className={cn(theme.textSecondary, 'text-sm')}>
                          Due: {formatDate(bill.dueDate)} ({daysUntil} days)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(theme.textPrimary, 'font-bold')}>{formatCurrency(bill.amount)}</p>
                        <button
                          onClick={() => markBillAsPaid(bill.id)}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Bills */}
          <div className={theme.card}>
            <h4 className={cn(theme.textPrimary, 'font-semibold mb-4')}>All Bills</h4>
            {bills.length === 0 ? (
              <div className="text-center py-8">
                <Bell className={cn(theme.textMuted, 'h-12 w-12 mx-auto mb-4')} />
                <p className={cn(theme.textMuted, 'mb-4')}>No bills added yet</p>
                <button
                  onClick={() => setShowBillForm(true)}
                  className={theme.btnPrimary}
                >
                  Add Your First Bill
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bills.map(bill => (
                  <div key={bill.id} className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    bill.isPaid 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : isOverdue(bill.dueDate)
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                      : theme.border
                  )}>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className={cn(theme.textPrimary, 'font-medium')}>{bill.name}</h5>
                        {bill.isPaid && (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded-full">
                            Paid
                          </span>
                        )}
                        {isOverdue(bill.dueDate) && !bill.isPaid && (
                          <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className={cn(theme.textSecondary, 'text-sm')}>
                        Due: {formatDate(bill.dueDate)} • {bill.category}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={cn(theme.textPrimary, 'font-bold')}>{formatCurrency(bill.amount)}</p>
                        {bill.isPaid && bill.paidDate && (
                          <p className={cn(theme.textMuted, 'text-xs')}>
                            Paid: {formatDate(bill.paidDate)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!bill.isPaid && (
                          <button
                            onClick={() => markBillAsPaid(bill.id)}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Mark Paid
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleEditBill(bill)}
                          className={cn(theme.interactive, 'p-2')}
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteBill(bill.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className={theme.card}>
          <h3 className={cn(theme.textPrimary, 'text-lg font-semibold mb-4')}>Calendar View</h3>
          <p className={cn(theme.textMuted, 'text-center py-8')}>
            Calendar view coming soon! This will show all your recurring transactions and bills in a monthly calendar format.
          </p>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showRecurringForm}
        onClose={() => {
          setShowRecurringForm(false);
          setEditingRecurring(null);
        }}
        title={editingRecurring ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
        size="lg"
      >
        <RecurringTransactionForm
          recurringTransaction={editingRecurring || undefined}
          onSubmit={handleRecurringSubmit}
          onCancel={() => {
            setShowRecurringForm(false);
            setEditingRecurring(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showBillForm}
        onClose={() => {
          setShowBillForm(false);
          setEditingBill(null);
        }}
        title={editingBill ? 'Edit Bill' : 'Add Bill'}
        size="lg"
      >
        <BillForm
          bill={editingBill || undefined}
          onSubmit={handleBillSubmit}
          onCancel={() => {
            setShowBillForm(false);
            setEditingBill(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default RecurringTransactions;