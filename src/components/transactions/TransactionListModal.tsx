import React from 'react';
import { X, Calendar, CreditCard } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Modal from '../common/Modal';
import InlineCategoryEditor from './InlineCategoryEditor';
import InlineTypeEditor from './InlineTypeEditor';
import { useData } from '../../contexts/DataContext';

interface TransactionListModalProps {
  transactions: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
}

const TransactionListModal: React.FC<TransactionListModalProps> = ({
  transactions,
  isOpen,
  onClose,
  title,
  subtitle
}) => {
  const theme = useThemeClasses();
  const { updateTransaction, deleteTransaction, transactions: allTransactions } = useData();

  // Get fresh transaction data to ensure UI updates immediately
  const freshTransactions = React.useMemo(() => {
    const transactionIds = transactions.map(t => t.id);
    return allTransactions.filter(t => transactionIds.includes(t.id));
  }, [transactions, allTransactions]);



  const handleDeleteTransaction = (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(transactionId);
    }
  };

  const totalAmount = freshTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <div className="space-y-4">
        {/* Header with summary */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-600">
          <div>
            {subtitle && (
              <p className={cn(theme.textSecondary, 'text-sm mb-1')}>{subtitle}</p>
            )}
            <div className="flex items-center space-x-4">
              <span className={cn(theme.textPrimary, 'text-lg font-semibold')}>
                {freshTransactions.length} transaction{freshTransactions.length !== 1 ? 's' : ''}
              </span>
              <span className={cn(
                'text-lg font-bold',
                freshTransactions[0]?.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {freshTransactions[0]?.type === 'income' ? '+' : '-'}{formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="max-h-96 overflow-y-auto">
          {freshTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <CreditCard className="h-12 w-12 mx-auto" />
              </div>
              <p className={cn(theme.textSecondary, 'text-lg')}>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {freshTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className={cn(
                        'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                      )}
                    >
                      {/* Date */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className={cn(theme.textSecondary, 'text-sm whitespace-nowrap')}>
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3">
                        <div>
                          <p className={cn(theme.textPrimary, 'font-medium truncate max-w-xs')} title={transaction.description}>
                            {transaction.description}
                          </p>
                          {transaction.paymentMethod && (
                            <p className={cn(theme.textMuted, 'text-xs capitalize')}>
                              {transaction.paymentMethod.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <InlineCategoryEditor
                          currentCategory={transaction.category || 'other'}
                          onSave={(categoryId) => updateTransaction(transaction.id, { ...transaction, category: categoryId })}
                        />
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        <InlineTypeEditor
                          currentType={transaction.type}
                          onSave={(newType) => updateTransaction(transaction.id, { ...transaction, type: newType })}
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right">
                        <span className={cn(
                          'font-bold',
                          transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        )}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete Transaction"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className={cn(theme.btnSecondary, 'flex items-center')}
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionListModal;