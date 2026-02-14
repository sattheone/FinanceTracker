import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Check, Scissors, Repeat, Folder, Tag, TrendingUp, MoreHorizontal } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { FirebaseService } from '../../services/firebaseService';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { extractMerchant, getMerchantKeyFromDescription, normalizeMerchant } from '../../utils/merchantSimilarity';
import SidePanel from '../common/SidePanel';
import SimpleTransactionForm, { SimpleTransactionFormHandle } from '../forms/SimpleTransactionForm';
import InlineCategoryEditor from './InlineCategoryEditor';
import InlineTypeEditor from './InlineTypeEditor';
import TagPopover from './TagPopover';
import CategoryPopover from './CategoryPopover';
import TagSettingsOverlay from './TagSettingsOverlay';
import SplitTransactionModal from './SplitTransactionModal';
import RecurringSetupModal from './RecurringSetupModal';

interface SimpleTransactionModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

const SimpleTransactionModal: React.FC<SimpleTransactionModalProps> = ({
  transaction: passedTransaction,
  isOpen,
  onClose,
  onTransactionClick
}) => {
  const { user } = useAuth();
  const { transactions: allTransactions, updateTransaction, deleteTransaction, categories: contextCategories, assets, loadAssets } = useData();
  const theme = useThemeClasses();
  const formRef = useRef<SimpleTransactionFormHandle>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showAssetLinkPicker, setShowAssetLinkPicker] = useState(false);
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false);
  const headerMoreRef = useRef<HTMLDivElement | null>(null);

  // LIVE DATA
  const transaction = allTransactions.find(t => t.id === passedTransaction.id) || passedTransaction;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkTagPopover, setShowBulkTagPopover] = useState(false);
  const [bulkTagAnchor, setBulkTagAnchor] = useState<HTMLElement | null>(null);
  const [showBulkCategoryPopover, setShowBulkCategoryPopover] = useState(false);
  const [bulkCategoryAnchor, setBulkCategoryAnchor] = useState<HTMLElement | null>(null);
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreContainerRef = useRef<HTMLDivElement | null>(null);
  const linkedAsset = assets.find(a => a.id === transaction.linkedAssetId);

  useEffect(() => {
    if (isOpen && assets.length === 0) {
      loadAssets();
    }
  }, [isOpen, assets.length, loadAssets]);

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
        const txnExists = allTransactions.some(t => t.id === id);
        if (txnExists) {
          return updateTransaction(id, { category: categoryId });
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
      .filter(t => !t.isSplitParent)
      .filter(t => normalizeMerchant(extractMerchant(t.description)) === normalizedCurrentMerchant)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, normalizedCurrentMerchant]);

  const currentMerchantKey = useMemo(
    () => getMerchantKeyFromDescription(transaction.description),
    [transaction.description]
  );

  const [historicalMatches, setHistoricalMatches] = useState<Transaction[]>([]);
  const [historyCursor, setHistoryCursor] = useState<{ date: string; id: string } | undefined>(undefined);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [useFallbackScan, setUseFallbackScan] = useState(false);
  const previousMerchantKeyRef = useRef<string>('');

  const allSimilarTransactions = useMemo(() => {
    const byId = new Map<string, Transaction>();
    matchedTransactions.forEach(t => byId.set(t.id, t));
    historicalMatches.forEach(t => {
      if (!byId.has(t.id)) {
        byId.set(t.id, t);
      }
    });
    return Array.from(byId.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matchedTransactions, historicalMatches]);

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(20);

  const visibleTransactions = useMemo(() =>
    allSimilarTransactions.slice(0, visibleCount),
    [allSimilarTransactions, visibleCount]
  );

  const selectedTxns = useMemo(
    () => allSimilarTransactions.filter(t => selectedIds.has(t.id)),
    [allSimilarTransactions, selectedIds]
  );

  const bulkCommonTagIds = useMemo(() => {
    if (selectedTxns.length === 0) return [] as string[];
    const initial = (selectedTxns[0].tags || []).slice();
    return selectedTxns.reduce((acc, t) => acc.filter(id => (t.tags || []).includes(id)), initial);
  }, [selectedTxns]);

  const bulkCommonType = useMemo(() => {
    if (selectedTxns.length === 0) return 'expense';
    const first = selectedTxns[0].type;
    return selectedTxns.every(t => t.type === first) ? first : 'expense';
  }, [selectedTxns]);

  useEffect(() => {
    const previousKey = previousMerchantKeyRef.current;

    // Keep expanded/lazy-loaded state when navigating within the same merchant group.
    // Reset only when merchant key changes.
    if (previousKey && previousKey !== normalizedCurrentMerchant) {
      setVisibleCount(20);
      setHistoricalMatches([]);
      setHistoryCursor(undefined);
      setHasMoreHistory(true);
      setSelectedIds(new Set());
      setUseFallbackScan(false);
    }

    previousMerchantKeyRef.current = normalizedCurrentMerchant;
  }, [normalizedCurrentMerchant]);

  useEffect(() => {
    if (!moreOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!moreContainerRef.current?.contains(target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [moreOpen]);

  useEffect(() => {
    if (!headerMoreOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!headerMoreRef.current?.contains(target)) {
        setHeaderMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [headerMoreOpen]);

  const handleBulkToggleTag = (tagId: string, shouldAdd: boolean) => {
    selectedTxns.forEach(t => {
      const existing = t.tags || [];
      const updated = shouldAdd
        ? (existing.includes(tagId) ? existing : [...existing, tagId])
        : existing.filter(tid => tid !== tagId);
      updateTransaction(t.id, { tags: updated });
    });
  };

  const fetchMoreHistoricalMatches = async () => {
    if (!user?.id || !normalizedCurrentMerchant || isLoadingMore || !hasMoreHistory) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const PAGE_SIZE = 120;
      const TARGET_NEW_MATCHES = 20;
      const MAX_PAGES_PER_CLICK = 8;

      let cursor = historyCursor;
      let canContinue: boolean = hasMoreHistory;
      let pagesScanned = 0;
      let added = 0;

      const knownIds = new Set<string>([
        ...allTransactions.map(t => t.id),
        ...historicalMatches.map(t => t.id)
      ]);
      const newlyMatched: Transaction[] = [];

      while (canContinue && pagesScanned < MAX_PAGES_PER_CLICK && added < TARGET_NEW_MATCHES) {
        const page = !useFallbackScan
          ? await FirebaseService.getTransactionsByMerchantKeyPage(user.id, currentMerchantKey, {
              pageSize: PAGE_SIZE,
              cursor
            })
          : await FirebaseService.getTransactionsPage(user.id, {
              pageSize: 500,
              cursor
            });

        pagesScanned += 1;
        cursor = page.nextCursor;
        canContinue = page.hasMore;

        page.transactions
          .filter(t => !t.isSplitParent)
          .filter(t =>
            useFallbackScan
              ? normalizeMerchant(extractMerchant(t.description)) === normalizedCurrentMerchant
              : true
          )
          .forEach(t => {
            if (!knownIds.has(t.id)) {
              knownIds.add(t.id);
              newlyMatched.push(t);
              added += 1;
            }
          });
      }

      if (newlyMatched.length > 0) {
        setHistoricalMatches(prev => [...prev, ...newlyMatched]);
      }
      setHistoryCursor(cursor);
      setHasMoreHistory(canContinue);
    } catch (error) {
      if (!useFallbackScan) {
        console.warn('Indexed merchant-key query failed, falling back to scan mode for similar transactions.', error);
        setUseFallbackScan(true);
      } else {
        console.error('Failed to load more similar transactions:', error);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreSimilar = async () => {
    if (visibleCount < allSimilarTransactions.length) {
      setVisibleCount(prev => prev + 20);
      return;
    }

    await fetchMoreHistoricalMatches();
    setVisibleCount(prev => prev + 20);
  };

  const handleUpdate = async (updatedData: Omit<Transaction, 'id'>) => {
    // Auto-save logic: update without closing
    await updateTransaction(transaction.id, updatedData);
  };

  // Avoid showing zero-amount split parent in the detail view.
  // When a split is saved, automatically switch to the first child transaction.
  useEffect(() => {
    if (!isOpen) return;
    if (transaction.isSplitParent && Number(transaction.amount) === 0) {
      const children = allTransactions
        .filter(t => t.splitGroupId === transaction.splitGroupId && !t.isSplitParent)
        .sort((a, b) => {
          const ao = (a as any).splitOrder ?? 0;
          const bo = (b as any).splitOrder ?? 0;
          return ao - bo;
        });
      if (children.length > 0) {
        onTransactionClick && onTransactionClick(children[0]);
      } else {
        // If no children, simply close the detail as there is nothing useful to show.
        onClose();
      }
    }
  }, [isOpen, transaction.isSplitParent, transaction.amount, transaction.splitGroupId, allTransactions, onTransactionClick, onClose]);

  // Handle child recreation after edit: if the current transaction ID no longer exists
  // (because children were deleted and recreated for ordering), redirect to the new child.
  useEffect(() => {
    if (!isOpen) return;
    const exists = allTransactions.some(t => t.id === passedTransaction.id);
    const wasChild = !!passedTransaction.splitGroupId && !!passedTransaction.splitParentId && !passedTransaction.isSplitParent;
    if (!exists && wasChild) {
      const children = allTransactions.filter(t => t.splitGroupId === passedTransaction.splitGroupId && !t.isSplitParent);
      if (children.length > 0) {
        // Prefer a child with the same category; fallback to splitOrder
        const sameCategory = children.find(c => c.category === passedTransaction.category);
        const nextChild = sameCategory || children.sort((a, b) => ((a as any).splitOrder ?? 0) - ((b as any).splitOrder ?? 0))[0];
        onTransactionClick && onTransactionClick(nextChild);
      }
    }
  }, [isOpen, allTransactions, passedTransaction.id, passedTransaction.splitGroupId, passedTransaction.splitParentId, passedTransaction.isSplitParent, passedTransaction.category, onTransactionClick]);

  return (
    <>
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
          {/* Top Bar Actions */}
          <div className="flex items-center gap-2 ml-4">
            {(() => {
              const isChildSplit = !!transaction.splitGroupId && !!transaction.splitParentId && !transaction.isSplitParent;
              const hasActiveChildren = transaction.splitGroupId
                ? allTransactions.some(t => t.splitGroupId === transaction.splitGroupId && !t.isSplitParent)
                : false;
              const label = isChildSplit && hasActiveChildren ? 'Edit Split' : 'Split';
              return (
                <button
                  onClick={() => setShowSplitModal(true)}
                  className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-1"
                  title={label}
                >
                  <Scissors className="w-4 h-4" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })()}
            <button
              onClick={() => setShowRecurringModal(true)}
              className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-1"
              title="Recurring"
            >
              <Repeat className="w-4 h-4" />
              <span className="text-xs font-medium">Recurring</span>
            </button>

            <div className="relative" ref={headerMoreRef}>
              <button
                onClick={() => setHeaderMoreOpen(prev => !prev)}
                className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-1"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-xs font-medium">More</span>
              </button>

              {headerMoreOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 py-1">
                  <button
                    onClick={() => {
                      setHeaderMoreOpen(false);
                      setShowAssetLinkPicker(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Link to Asset
                  </button>
                  {transaction.linkedAssetId && (
                    <button
                      onClick={async () => {
                        await updateTransaction(transaction.id, { linkedAssetId: undefined });
                        setHeaderMoreOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      Remove Link
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this transaction?')) {
                        deleteTransaction(transaction.id);
                        onClose();
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
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

        {linkedAsset && (
          <div className="px-1">
            <span className="inline-flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 text-xs font-medium">
              Linked Asset: {linkedAsset.name}
            </span>
          </div>
        )}

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
              {allSimilarTransactions.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedIds.size === allSimilarTransactions.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(allSimilarTransactions.map(t => t.id)));
                    }
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap leading-5"
                >
                  {selectedIds.size === allSimilarTransactions.length ? 'Deselect All' : 'Select All'}
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
                      t.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                </div>
              );
            })}

            {(visibleCount < allSimilarTransactions.length || hasMoreHistory) && (
              <div className="pt-2">
                <button
                  onClick={handleLoadMoreSimilar}
                  disabled={isLoadingMore}
                  className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading more...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidePanel>
    {/* Floating bulk actions bar */}
    {selectedIds.size > 0 && (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80]">
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {selectedIds.size} selected
          </span>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            onClick={(e) => {
              setBulkCategoryAnchor(e.currentTarget);
              setShowBulkCategoryPopover(true);
            }}
          >
            <Folder className="w-4 h-4" />
            Category
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            onClick={(e) => {
              setBulkTagAnchor(e.currentTarget);
              setShowBulkTagPopover(true);
            }}
          >
            <Tag className="w-4 h-4" />
            Tag
          </button>
          <InlineTypeEditor
            currentType={bulkCommonType}
            allowUnchanged={false}
            onSave={(newType) => {
              if (newType === 'unchanged') return;
              selectedTxns.forEach(t => updateTransaction(t.id, { type: newType }));
            }}
            triggerClassName="inline-flex items-center gap-2 h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            triggerContent={(
              <>
                <TrendingUp className="w-4 h-4" />
                <span>Type</span>
              </>
            )}
          />
          <div className="relative" ref={moreContainerRef}>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              onClick={() => setMoreOpen(v => !v)}
            >
              <MoreHorizontal className="w-4 h-4" />
              More
            </button>
            {moreOpen && (
              <div className="absolute bottom-12 right-0 w-44 z-50">
                <div className={cn(theme.dropdown, "py-1")}
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="more-menu">
                  <button
                    className={cn(theme.dropdownItem, "w-full text-left text-sm")}
                    onClick={() => {
                        setSelectedIds(new Set(allSimilarTransactions.map(t => t.id)));
                      setMoreOpen(false);
                    }}
                  >
                    Select all
                  </button>
                  <button
                    className={cn(theme.dropdownItem, "w-full text-left text-sm")}
                    onClick={() => {
                      setSelectedIds(new Set());
                      setMoreOpen(false);
                    }}
                  >
                    Unselect all
                  </button>
                  <div className="px-1 pt-1">
                    <button
                      className={cn(theme.dropdownItem, "w-full text-left text-sm rounded-md hover:bg-red-50")}
                      style={{ color: '#dc2626' }}
                      onClick={() => {
                        selectedIds.forEach(id => deleteTransaction(id));
                        setSelectedIds(new Set());
                        setMoreOpen(false);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    {/* Bulk Tag Popover */}
    {showBulkTagPopover && (
      <TagPopover
        isOpen={showBulkTagPopover}
        onClose={() => {
          setShowBulkTagPopover(false);
          setBulkTagAnchor(null);
        }}
        anchorElement={bulkTagAnchor}
        bulkCommonTagIds={bulkCommonTagIds}
        onBulkToggleTag={handleBulkToggleTag}
        onOpenTagSettings={() => setShowTagSettings(true)}
      />
    )}
    {/* Bulk Category Popover */}
    {showBulkCategoryPopover && (
      <CategoryPopover
        isOpen={showBulkCategoryPopover}
        onClose={() => {
          setShowBulkCategoryPopover(false);
          setBulkCategoryAnchor(null);
        }}
        anchorElement={bulkCategoryAnchor}
        currentCategory={''}
        onSelect={(id) => {
          selectedTxns.forEach(t => updateTransaction(t.id, { category: id }));
          setSelectedIds(new Set());
          setShowBulkCategoryPopover(false);
          setBulkCategoryAnchor(null);
        }}
      />
    )}
    {/* Tag Settings Overlay */}
    <TagSettingsOverlay
      isOpen={showTagSettings}
      onClose={() => setShowTagSettings(false)}
    />
    {/* Split Modal */}
    {showSplitModal && (
      <SplitTransactionModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        transaction={transaction.splitParentId ? (allTransactions.find(t => t.id === transaction.splitParentId) || transaction) : transaction}
      />
    )}
    {/* Recurring Modal */}
    {showRecurringModal && (
      <RecurringSetupModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        transaction={transaction}
        onSave={() => setShowRecurringModal(false)}
      />
    )}

    {showAssetLinkPicker && (
      <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Link transaction to asset</h3>
            <button
              onClick={() => setShowAssetLinkPicker(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Close
            </button>
          </div>
          <div className="max-h-[340px] overflow-y-auto p-2">
            {assets.length === 0 ? (
              <p className="text-sm text-gray-500 px-2 py-3">No assets available.</p>
            ) : (
              assets.map(asset => (
                <button
                  key={asset.id}
                  onClick={async () => {
                    await updateTransaction(transaction.id, { linkedAssetId: asset.id });
                    setShowAssetLinkPicker(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between',
                    transaction.linkedAssetId === asset.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  )}
                >
                  <span>{asset.name}</span>
                  <span className="text-xs opacity-70 capitalize">{asset.category.replace('_', ' ')}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default SimpleTransactionModal;