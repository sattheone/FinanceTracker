import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../hooks/useThemeClasses';
import TransactionTable from './TransactionTable';
import TagPopover from './TagPopover';
import TagSettingsOverlay from './TagSettingsOverlay';
import { useData } from '../../contexts/DataContext';

interface TransactionListOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    transactions: Transaction[];
    onTransactionClick?: (transaction: Transaction) => void;
    onDeleteTransaction?: (transactionId: string) => void;
    onUpdateTransaction?: (transactionId: string, updates: Partial<Transaction>) => void;
}

const TransactionListOverlay: React.FC<TransactionListOverlayProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    transactions,
    onTransactionClick,
    onDeleteTransaction,
    onUpdateTransaction
}) => {
    const { updateTransaction } = useData();
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [showTagPopover, setShowTagPopover] = useState(false);
    const [tagPopoverTransaction, setTagPopoverTransaction] = useState<Transaction | null>(null);
    const [tagPopoverAnchor, setTagPopoverAnchor] = useState<HTMLElement | null>(null);
    const [showTagSettings, setShowTagSettings] = useState(false);
    const [showBulkTagPopover, setShowBulkTagPopover] = useState(false);
    const [bulkTagPopoverAnchor, setBulkTagPopoverAnchor] = useState<HTMLElement | null>(null);

    const selectedTxns = useMemo(() => transactions.filter(t => selectedTransactions.has(t.id)), [transactions, selectedTransactions]);
    const bulkCommonTagIds = useMemo(() => {
        if (selectedTxns.length === 0) return [] as string[];
        const initial = (selectedTxns[0].tags || []).slice();
        return selectedTxns.reduce((acc, t) => acc.filter(id => (t.tags || []).includes(id)), initial);
    }, [selectedTxns]);

    const handleBulkToggleTag = async (tagId: string) => {
        const isCommon = bulkCommonTagIds.includes(tagId);
        for (const t of selectedTxns) {
            const current = new Set(t.tags || []);
            if (isCommon) {
                current.delete(tagId);
            } else {
                current.add(tagId);
            }
            await updateTransaction(t.id, { tags: Array.from(current) });
        }
    };

    if (!isOpen) return null;

    const displayTransactions = useMemo(() => transactions.filter(t => !t.isSplitParent), [transactions]);
    const totalAmount = displayTransactions.reduce((sum, t) => sum + t.amount, 0);

    const handleSelectTransaction = (id: string) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    };

    const handleSelectAll = (selected?: boolean) => {
        // TransactionTable passes boolean or we can toggle
        if (selected === false || (selected === undefined && selectedTransactions.size === transactions.length)) {
            setSelectedTransactions(new Set());
        } else {
            setSelectedTransactions(new Set(transactions.map(t => t.id)));
        }
    };

    return (
        <>
            {/* Darker Backdrop (on top of previous overlay) */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Side Panel - extra wide for table */}
            <div
                className={cn(
                    "fixed right-0 top-0 bottom-0 w-full md:w-[900px] lg:w-[1000px]",
                    "bg-white dark:bg-gray-800 shadow-2xl z-[70] overflow-hidden flex flex-col",
                    "transform transition-all duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Action Bar - 40px */}
                <div className="flex-shrink-0 h-10 px-4 flex items-center justify-end bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Info Section */}
                <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-start justify-between">
                        {/* Left: Title and Transaction Count */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {title}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {displayTransactions.length} transaction{displayTransactions.length !== 1 ? 's' : ''}
                                {selectedTransactions.size > 0 && ` • ${selectedTransactions.size} selected`}
                            </p>
                        </div>

                        {/* Right: Month/Year and Amount */}
                        <div className="text-right ml-6">
                            {subtitle && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    {subtitle}
                                </p>
                            )}
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalAmount)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transactions Table - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <TransactionTable
                        transactions={displayTransactions}
                        selectedTransactions={selectedTransactions}
                        onSelectTransaction={handleSelectTransaction}
                        onSelectAll={handleSelectAll}
                        onClearSelection={() => setSelectedTransactions(new Set())}
                        onTransactionClick={onTransactionClick}
                        onDeleteTransaction={onDeleteTransaction}
                        onUpdateTransaction={onUpdateTransaction}
                        onTagClick={(t, anchor) => {
                            setTagPopoverTransaction(t);
                            setTagPopoverAnchor(anchor);
                            setShowTagPopover(true);
                        }}
                        onBulkTagClick={(anchor) => {
                            setBulkTagPopoverAnchor(anchor as HTMLElement);
                            setShowBulkTagPopover(true);
                        }}
                    />
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

            {/* Bulk Tag Popover */}
            {showBulkTagPopover && (
                <TagPopover
                    isOpen={showBulkTagPopover}
                    onClose={() => {
                        setShowBulkTagPopover(false);
                        setBulkTagPopoverAnchor(null);
                    }}
                    anchorElement={bulkTagPopoverAnchor}
                    bulkCommonTagIds={bulkCommonTagIds}
                    onBulkToggleTag={handleBulkToggleTag}
                    onOpenTagSettings={() => setShowTagSettings(true)}
                />
            )}
        </>
    );
};

export default TransactionListOverlay;
