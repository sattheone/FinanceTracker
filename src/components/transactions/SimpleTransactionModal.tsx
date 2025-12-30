import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import SidePanel from '../common/SidePanel';
import SimpleTransactionForm, { SimpleTransactionFormHandle } from '../forms/SimpleTransactionForm';
import InlineCategoryEditor from './InlineCategoryEditor';

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
  transaction: passedTransaction,
  isOpen,
  onClose,
  onTransactionClick
}) => {
  const { transactions: allTransactions, updateTransaction, categories: contextCategories } = useData();
  const theme = useThemeClasses();
  const formRef = useRef<SimpleTransactionFormHandle>(null);

  // LIVE DATA
  const transaction = allTransactions.find(t => t.id === passedTransaction.id) || passedTransaction;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection when opening a new transaction
  useEffect(() => {
    setSelectedIds(new Set());
  }, [passedTransaction.id]);

  // Handle Bulk Update
  const handleBulkUpdate = async (categoryId: string) => {
    const idsToUpdate = Array.from(selectedIds);
    setSaveStatus('saving');

    try {
      await Promise.all(idsToUpdate.map(id => {
        const txn = allTransactions.find(t => t.id === id);
        if (txn) {
          return updateTransaction(id, { ...txn, category: categoryId });
        }
        return Promise.resolve();
      }));
      setSaveStatus('saved');
      setSelectedIds(new Set()); // Clear selection after update
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Bulk update failed", error);
      setSaveStatus('error');
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

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

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(20);
  const scrollTriggerRef = useRef<HTMLDivElement>(null);

  const visibleTransactions = useMemo(() =>
    matchedTransactions.slice(0, visibleCount),
    [matchedTransactions, visibleCount]
  );

  useEffect(() => {
    // Reset visible count when transaction changes
    setVisibleCount(20);
  }, [transaction.id]);

  // Lazy Loading Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 20);
      }
    }, { threshold: 0.1 });

    if (scrollTriggerRef.current) {
      observer.observe(scrollTriggerRef.current);
    }
    return () => observer.disconnect();
  }, [visibleTransactions]);

  const handleUpdate = async (updatedData: Omit<Transaction, 'id'>) => {
    // Auto-save logic: update without closing
    await updateTransaction(transaction.id, {
      ...transaction,
      ...updatedData
    });
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={selectedIds.size > 0 ? `${selectedIds.size} Selected` : "Transaction Details"}
      size="md"
      footer={<></>}
      headerActions={
        <div className="flex items-center space-x-2 mr-2">
          {/* Save Status Indicator */}
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-500 animate-pulse flex items-center">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 flex items-center transition-opacity duration-1000">
              <Check className="w-3 h-3 mr-1" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Error saving</span>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Reuse the inline-edit form */}
        <SimpleTransactionForm
          ref={formRef}
          transaction={transaction}
          onSubmit={handleUpdate}
          onCancel={onClose}
          hideActions
          autoSave={true}
          onSaveStatusChange={setSaveStatus}
        />

        {/* History List */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3 h-5">
            <h3 className="text-sm font-medium text-gray-500 leading-5">Similar transactions</h3>
            <div className="flex items-center gap-2 h-5">
              {selectedIds.size > 0 && (
                <>
                  <InlineCategoryEditor
                    currentCategory=""
                    onSave={handleBulkUpdate}
                    renderTrigger={(onClick) => (
                      <button
                        onClick={onClick}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap leading-5 relative -top-[2px]"
                      >
                        Change Category
                      </button>
                    )}
                  />
                  <span className="text-gray-300 leading-5 relative -top-[2px]">|</span>
                </>
              )}
              {matchedTransactions.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedIds.size === matchedTransactions.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(matchedTransactions.map(t => t.id)));
                    }
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap leading-5"
                >
                  {selectedIds.size === matchedTransactions.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {visibleTransactions.map(t => {
              const isCurrent = t.id === transaction.id;
              const isSelected = selectedIds.has(t.id);
              const tCategory = contextCategories?.find(c => c.id === t.category) || { icon: '📋', name: 'Other' };

              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center p-3 rounded-lg transition-colors group relative",
                    (isCurrent || isSelected)
                      ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/50"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  {/* Selection Checkbox */}
                  <div className="mr-3 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation(); // Prevent row click
                        toggleSelection(t.id);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Existing Row Content (Clickable) */}
                  <div
                    className="flex-1 flex items-center min-w-0 cursor-pointer"
                    onClick={() => !isCurrent && onTransactionClick && onTransactionClick(t)}
                  >
                    <div className="w-24 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatDate(t.date)}
                    </div>
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
                    <div className={cn(
                      "text-right text-sm font-medium flex-shrink-0 w-24",
                      t.type === 'expense' ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SidePanel>
  );
};

export default SimpleTransactionModal;