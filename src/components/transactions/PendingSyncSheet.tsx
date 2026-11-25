import React, { useState, useMemo } from 'react';
import { Undo2, Edit3, Clock, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import SidePanel from '../common/SidePanel';
import SimpleTransactionModal from './SimpleTransactionModal';

interface PendingSyncSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const PendingSyncSheet: React.FC<PendingSyncSheetProps> = ({ isOpen, onClose }) => {
  const {
    transactions, pendingEditIds, pendingNewIds, pendingEditSnapshots,
    pendingChangeCount, discardPendingChange, syncPendingChanges,
    isSyncing, categories
  } = useData();
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  const pendingTransactions = useMemo(() =>
    transactions.filter(t => pendingEditIds.has(t.id)),
    [transactions, pendingEditIds]
  );

  const deletedCount = pendingChangeCount - pendingEditIds.size;

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const handleDiscard = (id: string) => {
    const isNew = pendingNewIds.has(id);
    const message = isNew
      ? 'Discard this new transaction? It will be removed entirely.'
      : 'Discard your edits? The transaction will revert to its previous state.';
    if (confirm(message)) {
      discardPendingChange(id);
    }
  };

  const handleSyncAll = async () => {
    await syncPendingChanges();
  };

  return (
    <>
      <SidePanel
        isOpen={isOpen}
        onClose={onClose}
        title="Pending Sync"
        size="md"
        headerActions={
          pendingChangeCount > 0 ? (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing…' : 'Sync All'}
            </button>
          ) : undefined
        }
      >
        {pendingChangeCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All changes synced</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No pending changes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex items-center gap-3 flex-wrap">
              {pendingNewIds.size > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Plus className="h-3 w-3" />
                  {pendingNewIds.size} new
                </span>
              )}
              {pendingEditSnapshots.size > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Edit3 className="h-3 w-3" />
                  {pendingEditSnapshots.size} {pendingEditSnapshots.size === 1 ? 'edit' : 'edits'}
                </span>
              )}
              {deletedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <Trash2 className="h-3 w-3" />
                  {deletedCount} {deletedCount === 1 ? 'deletion' : 'deletions'}
                </span>
              )}
            </div>

            {/* Pending transactions list */}
            {pendingTransactions.length > 0 && (
              <div className="space-y-1">
                <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {pendingTransactions.map(t => {
                    const isNew = pendingNewIds.has(t.id);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      >
                        {/* Click area: description + meta */}
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => setEditTransaction(t)}
                        >
                          <div className="flex items-center gap-2">
                            {/* New / Edited badge */}
                            <span className={cn(
                              'inline-flex shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
                              isNew
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            )}>
                              {isNew ? 'New' : 'Edited'}
                            </span>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">
                              {t.description}
                            </p>
                            <span className={cn(
                              'text-sm font-semibold shrink-0',
                              t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            )}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 ml-[calc(1.5rem+0.5rem)]">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(t.date)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {getCategoryName(t.category)}
                            </span>
                          </div>
                        </button>

                        {/* Sync individual */}
                        <button
                          onClick={handleSyncAll}
                          disabled={isSyncing}
                          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                          title="Sync now"
                        >
                          <Upload className={cn('h-4 w-4', isSyncing && 'animate-pulse')} />
                        </button>

                        {/* Discard change */}
                        <button
                          onClick={() => handleDiscard(t.id)}
                          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={isNew ? 'Discard new transaction' : 'Revert to original'}
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deleted count note */}
            {deletedCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1 italic">
                {deletedCount} deleted {deletedCount === 1 ? 'transaction' : 'transactions'} will be removed on next sync.
              </p>
            )}
          </div>
        )}
      </SidePanel>

      {/* Edit overlay — opens on top of this sheet */}
      {editTransaction && (
        <SimpleTransactionModal
          transaction={editTransaction}
          isOpen={!!editTransaction}
          onClose={() => setEditTransaction(null)}
        />
      )}
    </>
  );
};

export default PendingSyncSheet;
