import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import SidePanel from '../common/SidePanel';
import TransactionTable from './TransactionTable';
import TagPopover from './TagPopover';
import TagSettingsOverlay from './TagSettingsOverlay';
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
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [tagPopoverTransaction, setTagPopoverTransaction] = useState<Transaction | null>(null);
  const [tagPopoverAnchor, setTagPopoverAnchor] = useState<HTMLElement | null>(null);
  const [showTagSettings, setShowTagSettings] = useState(false);

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

  const handleUpdateTransaction = (transactionId: string, updates: Partial<Transaction>) => {
    const transaction = freshTransactions.find(t => t.id === transactionId);
    if (transaction) {
      updateTransaction(transactionId, updates);
    }
  };

  const totalAmount = freshTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={cn(theme.btnSecondary, 'flex items-center')}
          >
            Close
          </button>
        </div>
      }
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
        <div className="flex-1">
          {freshTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <CreditCard className="h-12 w-12 mx-auto" />
              </div>
              <p className={cn(theme.textSecondary, 'text-lg')}>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TransactionTable
                transactions={freshTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onTagClick={(t, anchor) => {
                  setTagPopoverTransaction(t);
                  setTagPopoverAnchor(anchor);
                  setShowTagPopover(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tag Popover */}
      {tagPopoverTransaction && (
        <TagPopover
          isOpen={showTagPopover}
          onClose={() => {
            setShowTagPopover(false);
            setTagPopoverTransaction(null);
            setTagPopoverAnchor(null);
          }}
          transaction={tagPopoverTransaction}
          onUpdateTransaction={updateTransaction}
          anchorElement={tagPopoverAnchor}
          onOpenTagSettings={() => setShowTagSettings(true)}
        />
      )}

      {/* Tag Settings Overlay */}
      <TagSettingsOverlay
        isOpen={showTagSettings}
        onClose={() => setShowTagSettings(false)}
      />
    </SidePanel>
  );
};

export default TransactionListModal;