import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, Edit3, Save, Repeat } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import SidePanel from '../common/SidePanel';
import RecurringSetupModal from './RecurringSetupModal';
import { calculateNextDueDate } from '../../utils/dateUtils';

interface SimpleTransactionModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

const extractMerchant = (description: string) => {
  if (!description) return '';
  const upiMatch = description.match(/^UPI-([A-Z\s]+)/i);
  if (upiMatch) {
    return upiMatch[1];
  }
  return description;
};

const normalizeMerchant = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\b\d{4,}\b/g, '')       // remove long numeric IDs only
    .replace(/[^a-z\s]/g, '')         // keep letters & spaces
    .replace(/\s+/g, ' ')
    .trim();
};

const SimpleTransactionModal: React.FC<SimpleTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onTransactionClick
}) => {
  const theme = useThemeClasses();
  const { transactions: allTransactions, updateTransaction, addRecurringTransaction, categories: contextCategories } = useData();

  // Use categories from context
  const categories = contextCategories || [];

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState({
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category || 'other',
    type: transaction.type,
    date: transaction.date,
    paymentMethod: transaction.paymentMethod || ''
  });

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(20);
  const scrollTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedTransaction({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category || 'other',
      type: transaction.type,
      date: transaction.date,
      paymentMethod: transaction.paymentMethod || ''
    });
    // Reset visible count when transaction changes
    setVisibleCount(20);
  }, [transaction]);

  // Reset edit mode when filtered transactions list is clicked? No, only on explicit action. 
  // Should we reset edit mode when transaction changes?
  useEffect(() => {
    setIsEditMode(false);
  }, [transaction.id]);

  // Normalize Merchant Logic
  const normalizedCurrentMerchant = useMemo(() =>
    normalizeMerchant(extractMerchant(transaction.description)),
    [transaction.description]
  );

  const matchedTransactions = useMemo(() => {
    if (!normalizedCurrentMerchant) return [];

    return allTransactions
      .filter(t => normalizeMerchant(extractMerchant(t.description)) === normalizedCurrentMerchant)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, normalizedCurrentMerchant]);

  const visibleTransactions = useMemo(() =>
    matchedTransactions.slice(0, visibleCount),
    [matchedTransactions, visibleCount]
  );

  // Lazy Loading Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Load more
        setVisibleCount(prev => prev + 20);
      }
    }, { threshold: 0.1 });

    if (scrollTriggerRef.current) {
      observer.observe(scrollTriggerRef.current);
    }

    return () => observer.disconnect();
  }, [visibleTransactions]); // Re-observe when list changes


  // Helper functions
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 dark:text-green-400';
      case 'expense': return 'text-red-600 dark:text-red-400';
      case 'investment': return 'text-blue-600 dark:text-blue-400';
      case 'insurance': return 'text-purple-600 dark:text-purple-400';
      default: return theme.textPrimary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'investment': return '📈';
      case 'insurance': return '🛡️';
      default: return '💳';
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id) || {
      id: 'other',
      name: 'Other',
      color: '#6B7280',
      icon: '📋',
      isCustom: false
    };
  };



  const handleSaveTransaction = async () => {
    await updateTransaction(transaction.id, {
      ...transaction,
      description: editedTransaction.description,
      amount: editedTransaction.amount,
      category: editedTransaction.category,
      type: editedTransaction.type,
      date: editedTransaction.date,
      paymentMethod: editedTransaction.paymentMethod || undefined
    });
    setIsEditMode(false);
  };

  const handleSaveRecurring = (settings: { frequency: string; interval: number; startDate: string }) => {
    addRecurringTransaction({
      name: transaction.description,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category || 'other',
      frequency: settings.frequency as any,
      interval: settings.interval,
      startDate: settings.startDate,
      nextDueDate: calculateNextDueDate(settings.startDate, settings.frequency, settings.interval),
      isActive: true,
      autoCreate: true,
      reminderDays: 3,
      tags: transaction.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    alert('Recurring transaction created!');
  };

  const handleEditChange = (field: string, value: any) => {
    setEditedTransaction(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <SidePanel
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "Edit Transaction" : "Transaction Details"}
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <button
              onClick={onClose}
              className={cn(theme.btnSecondary, 'flex items-center')}
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </button>

            <div className="flex space-x-2">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className={cn(theme.btnSecondary, 'flex items-center')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTransaction}
                    className={cn(theme.btnPrimary, 'flex items-center')}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={cn(theme.btnPrimary, 'flex items-center')}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowRecurringModal(true)}
                    className={cn(theme.btnSecondary, 'flex items-center ml-2')}
                    title="Mark as Recurring"
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Transaction Header */}
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-6">
            <div className="text-5xl mb-4">{getTypeIcon(transaction.type)}</div>
            {isEditMode ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editedTransaction.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="text-xl font-semibold text-center w-full border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent pb-1"
                  placeholder="Description"
                />
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl text-gray-400">₹</span>
                  <input
                    type="number"
                    value={editedTransaction.amount}
                    onChange={(e) => handleEditChange('amount', Number(e.target.value))}
                    className="text-3xl font-bold text-center w-40 border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent pb-1"
                    step="0.01"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words"
                  title={transaction.description}
                >
                  {transaction.description}
                </h2>
                <div className={cn('text-3xl font-bold', getTypeColor(transaction.type))}>
                  {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                </div>
              </>
            )}
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500 mr-4" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editedTransaction.date}
                    onChange={(e) => handleEditChange('date', e.target.value)}
                    className="mt-1 block w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(transaction.date)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
              <Tag className="w-5 h-5 text-gray-500 mr-4" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                {isEditMode ? (
                  <select
                    value={editedTransaction.category}
                    onChange={(e) => handleEditChange('category', e.target.value)}
                    className="mt-1 block w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                  >
                    {categories
                      .filter(c => transaction.type !== 'expense' || c.id !== 'salary')
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <span>{getCategoryById(transaction.category || 'other').icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {getCategoryById(transaction.category || 'other').name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-500 mr-4" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                {isEditMode ? (
                  <select
                    value={editedTransaction.type || transaction.type}
                    onChange={(e) => handleEditChange('type', e.target.value)}
                    className="mt-1 block w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                  >
                    <option value="income">💰 Income</option>
                    <option value="expense">💸 Expense</option>
                    <option value="investment">📊 Investment</option>
                    <option value="insurance">🛡️ Insurance</option>
                  </select>
                ) : (
                  <p className={cn('text-sm font-medium mt-1 capitalize', getTypeColor(transaction.type))}>
                    {transaction.type}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
              <CreditCard className="w-5 h-5 text-gray-500 mr-4" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
                {isEditMode ? (
                  <select
                    value={editedTransaction.paymentMethod}
                    onChange={(e) => handleEditChange('paymentMethod', e.target.value)}
                    className="mt-1 block w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                  >
                    <option value="">Select Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="upi">UPI</option>
                    <option value="net_banking">Net Banking</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 capitalize">
                    {transaction.paymentMethod?.replace('_', ' ') || 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {transaction.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

          {/* Copilot-style History List */}
          <div className="mt-4">
            {/* No header per user request */}
            <div className="space-y-1">
              {visibleTransactions.map(t => {
                const isCurrent = t.id === transaction.id;
                const tCategory = getCategoryById(t.category || 'other');
                return (
                  <div
                    key={t.id}
                    onClick={() => !isCurrent && onTransactionClick && onTransactionClick(t)}
                    className={cn(
                      "flex items-center p-3 rounded-lg transition-colors",
                      isCurrent
                        ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/50"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    )}
                  >
                    {/* Date */}
                    <div className="w-24 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatDate(t.date)}
                    </div>

                    {/* Description & Category */}
                    <div className="flex-1 min-w-0 px-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{tCategory.icon}</span>
                        <span className={cn(
                          "text-sm font-medium truncate",
                          isCurrent ? "text-blue-700 dark:text-blue-300" : theme.textPrimary
                        )}>
                          {t.description}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className={cn(
                      "text-right text-sm font-medium flex-shrink-0 w-24",
                      getTypeColor(t.type)
                    )}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Intersection Observer Trigger */}
            {visibleCount < matchedTransactions.length && (
              <div ref={scrollTriggerRef} className="h-8 w-full flex items-center justify-center mt-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

        </div>
      </SidePanel>

      <RecurringSetupModal
        transaction={transaction}
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSave={handleSaveRecurring}
      />
    </>
  );
};

export default SimpleTransactionModal;