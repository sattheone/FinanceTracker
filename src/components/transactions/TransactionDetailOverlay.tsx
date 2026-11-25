import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    Calendar, 
    Tag, 
    Hash, 
    Type, 
    Scissors, 
    Repeat, 
    Trash2, 
    Flag, 
    Building, 
    Clock, 
    StickyNote, 
    CheckCircle2 
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import AutoCategorizationService from '../../services/autoCategorization';
import SplitTransactionModal from './SplitTransactionModal';
import RecurringSetupModal from './RecurringSetupModal';

interface TransactionDetailOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onUpdate: (id: string, updates: Partial<Transaction>) => void;
    onDelete: (id: string) => void;
    onSelectTransaction?: (t: Transaction) => void;
}

const TransactionDetailOverlay: React.FC<TransactionDetailOverlayProps> = ({
    isOpen,
    onClose,
    transaction,
    onDelete,
    onUpdate,
    onSelectTransaction
}) => {
    const { categories, categoryRules, bankAccounts, transactions } = useData();
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [reviewNote, setReviewNote] = useState(transaction?.reviewNote || '');

    useEffect(() => {
        setReviewNote(transaction?.reviewNote || '');
    }, [transaction]);

    // Lazy Repair: Check if we can retroactive apply a rule when viewing
    React.useEffect(() => {
        if (isOpen && transaction && !transaction.appliedRule) {
            const activeRules = categoryRules.filter(r => r.isActive);
            const result = AutoCategorizationService.suggestCategoryForTransaction(
                transaction.description,
                transaction.amount,
                transaction.type as any,
                activeRules
            );

            if (result.appliedRule) {
                const isGeneric = !transaction.category || transaction.category === 'other' || transaction.category === 'uncategorized';
                const matchesCategory = transaction.category === result.categoryId;

                if (isGeneric || matchesCategory) {
                    if (onUpdate) {
                        onUpdate(transaction.id, {
                            ...transaction,
                            category: result.categoryId,
                            appliedRule: result.appliedRule
                        });
                    }
                }
            }
        }
    }, [isOpen, transaction, categoryRules, onUpdate]);

    // Memory Trigger: Find other transactions on the same date
    const sameDayTransactions = useMemo(() => {
        if (!transaction || !transactions) return [];
        return transactions.filter(t => 
            t.id !== transaction.id && 
            !t.isSplitParent && 
            t.date === transaction.date
        );
    }, [transaction, transactions]);

    const account = useMemo(() => {
        if (!transaction?.bankAccountId || !bankAccounts) return null;
        return bankAccounts.find(a => a.id === transaction.bankAccountId);
    }, [transaction, bankAccounts]);

    if (!isOpen || !transaction) return null;

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            onDelete(transaction.id);
            onClose();
        }
    };

    const handleSaveReviewNote = () => {
        if (transaction && reviewNote !== (transaction.reviewNote || '')) {
            onUpdate(transaction.id, { reviewNote });
        }
    };

    const handleToggleReview = (needsReview: boolean) => {
        onUpdate(transaction.id, { needsReview });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[80] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className={cn(
                "fixed right-0 top-0 bottom-0 w-full md:w-[500px]",
                "bg-white dark:bg-gray-800 shadow-2xl z-[90] overflow-hidden flex flex-col",
                "transform transition-all duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Review Banner if flagged */}
                {transaction.needsReview && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-6 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                Flagged for Review
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleReview(false)}
                            className="px-3 py-1 rounded-lg bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-gray-700 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Mark as Reviewed
                        </button>
                    </div>
                )}

                {/* Top Bar Actions */}
                <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-wrap">
                    {!transaction.needsReview ? (
                        <button
                            onClick={() => handleToggleReview(true)}
                            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-amber-50 dark:bg-gray-700 dark:hover:bg-amber-900/20 text-gray-700 hover:text-amber-600 dark:text-gray-200 dark:hover:text-amber-400 flex items-center gap-2 transition-colors"
                            title="Flag this transaction to review later"
                        >
                            <Flag className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium">Flag Review</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleToggleReview(false)}
                            className="px-3 py-2 rounded-lg bg-amber-100 hover:bg-gray-200 dark:bg-amber-900/30 dark:hover:bg-gray-700 text-amber-800 dark:text-amber-300 flex items-center gap-2 transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium">Reviewed</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowSplitModal(true)}
                        className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                    >
                        <Scissors className="w-4 h-4" />
                        <span className="text-sm font-medium">Split</span>
                    </button>
                    <button
                        onClick={() => setShowRecurringModal(true)}
                        className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                    >
                        <Repeat className="w-4 h-4" />
                        <span className="text-sm font-medium">Recurring</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="ml-auto px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Delete</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Amount & Description */}
                    <div className="text-center mb-6">
                        <div className={cn(
                            "text-4xl font-bold mb-2",
                            transaction.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'
                        )}>
                            {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-gray-700 dark:text-gray-200 font-medium text-lg">
                            {transaction.description}
                        </div>
                    </div>

                    {/* Review Note Box */}
                    <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                                <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                Review Reminder Note
                            </div>
                            {reviewNote !== (transaction.reviewNote || '') && (
                                <button
                                    type="button"
                                    onClick={handleSaveReviewNote}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                >
                                    Save Note
                                </button>
                            )}
                        </div>
                        <textarea
                            rows={2}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            onBlur={handleSaveReviewNote}
                            placeholder="Add a reminder note (e.g. 'Check Amazon orders', 'Pending shared bill', etc.)..."
                            className="w-full text-xs p-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                    </div>

                    {/* Details List */}
                    <div className="space-y-4">
                        {/* Date with Weekday (Memory Trigger) */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <Calendar className="w-5 h-5 mr-3" />
                                <span>Date & Day</span>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white text-right">
                                {new Date(transaction.date).toLocaleDateString('en-GB', { 
                                    weekday: 'long', 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                })}
                            </span>
                        </div>

                        {/* Account / Card Used (Memory Trigger) */}
                        {account && (
                            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center text-gray-500 dark:text-gray-400">
                                    <Building className="w-5 h-5 mr-3" />
                                    <span>Account / Card</span>
                                </div>
                                <div className="text-right font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <span>{account.bank}</span>
                                    {account.number && (
                                        <span className="text-xs text-gray-400 font-normal">
                                            (•••• {account.number.slice(-4)})
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Category */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <Tag className="w-5 h-5 mr-3" />
                                <span>Category</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-medium text-gray-900 dark:text-white capitalize">
                                    {categories.find(c => c.id === transaction.category)?.name || transaction.category}
                                </span>
                                {transaction.appliedRule && (
                                    <div className="ml-2 relative group">
                                        <div className="cursor-help text-purple-500" title={`Categorized by rule: "${transaction.appliedRule.name}"`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wand-2">
                                                <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recurring */}
                        {transaction.recurringTransactionId && (
                            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center text-gray-500 dark:text-gray-400">
                                    <Repeat className="w-5 h-5 mr-3" />
                                    <span>Recurring</span>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    <Repeat className="w-3 h-3" />
                                    Monthly
                                </span>
                            </div>
                        )}

                        {/* Type */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <Type className="w-5 h-5 mr-3" />
                                <span>Type</span>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white capitalize">
                                {transaction.type}
                            </span>
                        </div>

                        {/* Transaction ID (System Info) */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <Hash className="w-5 h-5 mr-3" />
                                <span>ID</span>
                            </div>
                            <span className="font-mono text-xs text-gray-400">
                                {transaction.id}
                            </span>
                        </div>
                    </div>

                    {/* Step 2 Memory Trigger: Same-Day Activity Section */}
                    {sameDayTransactions.length > 0 && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                        Other Transactions on this Day ({sameDayTransactions.length})
                                    </h3>
                                </div>
                                <span className="text-[10px] text-gray-400">Memory Trigger</span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Other purchases made on the same date to help recall where you were:
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {sameDayTransactions.map((other) => (
                                    <div
                                        key={other.id}
                                        onClick={() => onSelectTransaction?.(other)}
                                        className={cn(
                                            "flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all",
                                            onSelectTransaction ? "cursor-pointer hover:border-indigo-400 hover:shadow-sm" : ""
                                        )}
                                        title="Click to view details"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                                {other.description}
                                            </p>
                                            <p className="text-[10px] text-gray-400 capitalize">
                                                {categories.find(c => c.id === other.category)?.name || other.category}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "text-xs font-semibold shrink-0",
                                            other.type === 'income' ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"
                                        )}>
                                            {other.type === 'income' ? '+' : '-'}{formatCurrency(other.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modals */}
            {showSplitModal && transaction && (
                <SplitTransactionModal
                    isOpen={showSplitModal}
                    onClose={() => setShowSplitModal(false)}
                    transaction={transaction}
                />
            )}

            {showRecurringModal && transaction && (
                <RecurringSetupModal
                    isOpen={showRecurringModal}
                    onClose={() => setShowRecurringModal(false)}
                    transaction={transaction}
                    onSave={() => setShowRecurringModal(false)}
                />
            )}
        </>
    );
};

export default TransactionDetailOverlay;
