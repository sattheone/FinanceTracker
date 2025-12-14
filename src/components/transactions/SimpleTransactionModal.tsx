import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, Edit3, Save, Repeat } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Modal from '../common/Modal';
import RecurringSetupModal from './RecurringSetupModal';
import { calculateNextDueDate } from '../../utils/dateUtils';

interface SimpleTransactionModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}



const SimpleTransactionModal: React.FC<SimpleTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose
}) => {
  const theme = useThemeClasses();
  const { transactions, updateTransaction, addRecurringTransaction, categories: contextCategories } = useData();

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

  useEffect(() => {
    setEditedTransaction({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category || 'other',
      type: transaction.type,
      date: transaction.date,
      paymentMethod: transaction.paymentMethod || ''
    });
  }, [transaction]);

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
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "Edit Transaction" : "Transaction Details"}
        size="md"
      >
        <div className="space-y-6">
          {/* Transaction Header */}
          <div className="text-center">
            <div className="text-4xl mb-2">{getTypeIcon(transaction.type)}</div>
            {isEditMode ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedTransaction.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="text-xl font-semibold text-center w-full border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent"
                />
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">₹</span>
                  <input
                    type="number"
                    value={editedTransaction.amount}
                    onChange={(e) => handleEditChange('amount', Number(e.target.value))}
                    className="text-2xl font-bold text-center w-32 border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent"
                    step="0.01"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2
                  className={cn(theme.heading2, 'mb-2')}
                  title={transaction.description}
                >
                  {transaction.description.length > 110
                    ? `${transaction.description.substring(0, 110)}...`
                    : transaction.description}
                </h2>
                <div className={cn('text-2xl font-bold', getTypeColor(transaction.type))}>
                  {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                </div>
              </>
            )}
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className={theme.textMuted}>Date</p>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editedTransaction.date}
                    onChange={(e) => handleEditChange('date', e.target.value)}
                    className="mt-1 input-field theme-input"
                  />
                ) : (
                  <p className={theme.textPrimary}>{formatDate(transaction.date)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className={theme.textMuted}>Category</p>
                {isEditMode ? (
                  <select
                    value={editedTransaction.category}
                    onChange={(e) => handleEditChange('category', e.target.value)}
                    className="mt-1 input-field theme-input"
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
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <span>{getCategoryById(transaction.category || 'other').icon}</span>
                      <span className={cn(theme.textPrimary, 'capitalize')}>
                        {getCategoryById(transaction.category || 'other').name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className={theme.textMuted}>Type</p>
                {isEditMode ? (
                  <select
                    value={editedTransaction.type || transaction.type}
                    onChange={(e) => handleEditChange('type', e.target.value)}
                    className="mt-1 input-field theme-input"
                  >
                    <option value="income">💰 Income</option>
                    <option value="expense">💸 Expense</option>
                    <option value="investment">📊 Investment</option>
                    <option value="insurance">🛡️ Insurance</option>
                  </select>
                ) : (
                  <p className={cn(theme.textPrimary, 'capitalize', getTypeColor(transaction.type))}>
                    {transaction.type}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className={theme.textMuted}>Payment Method</p>
                {isEditMode ? (
                  <select
                    value={editedTransaction.paymentMethod}
                    onChange={(e) => handleEditChange('paymentMethod', e.target.value)}
                    className="mt-1 input-field theme-input"
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
                  <p className={cn(theme.textPrimary, 'capitalize')}>
                    {transaction.paymentMethod || 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div>
              <p className={cn(theme.textMuted, 'mb-2')}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {transaction.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}


          {/* Action Buttons */}
          <div className="flex justify-between">
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
                    Edit Transaction
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
        </div>
      </Modal>

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