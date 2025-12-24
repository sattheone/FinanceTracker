import React from 'react';
import { X, Calendar, Tag, Hash, Type } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import AutoCategorizationService from '../../services/autoCategorization';

interface TransactionDetailOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onUpdate: (id: string, updates: Partial<Transaction>) => void;
    onDelete: (id: string) => void;
}

const TransactionDetailOverlay: React.FC<TransactionDetailOverlayProps> = ({
    isOpen,
    onClose,
    transaction,
    onDelete,
    onUpdate
}) => {
    const { categories, categoryRules } = useData();

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
                // Determine if we should update
                // If category matches rule, OR if current category is generic 'other'
                const isGeneric = !transaction.category || transaction.category === 'other' || transaction.category === 'uncategorized';
                const matchesCategory = transaction.category === result.categoryId;

                if (isGeneric || matchesCategory) {
                    if (onUpdate) {
                        console.log(`🪄 Auto-repairing rule attribution for: ${transaction.description}`);
                        onUpdate(transaction.id, {
                            ...transaction,
                            category: result.categoryId,
                            appliedRule: result.appliedRule
                        });
                    } else {
                        console.warn("TransactionDetailOverlay: onUpdate prop missing, cannot auto-repair attribution.");
                    }
                }
            }
        }
    }, [isOpen, transaction, categoryRules, onUpdate]);

    if (!isOpen || !transaction) return null;

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            onDelete(transaction.id);
            onClose();
        }
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Amount & Description */}
                    <div className="text-center mb-8">
                        <div className={cn(
                            "text-4xl font-bold mb-2",
                            transaction.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'
                        )}>
                            {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                            {transaction.description}
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-4">
                        {/* Date */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <Calendar className="w-5 h-5 mr-3" />
                                <span>Date</span>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatDate(transaction.date)}
                            </span>
                        </div>

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

                    {/* Actions */}
                    <div className="pt-6 flex gap-4">
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-3 px-4 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg font-medium transition-colors"
                        >
                            Delete Transaction
                        </button>
                        {/* Edit could be implemented here or inline */}
                    </div>

                </div>
            </div>
        </>
    );
};

export default TransactionDetailOverlay;
