import React, { useState } from 'react';
import { X, Edit3, Trash2, CheckSquare, Square } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../hooks/useThemeClasses';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import InlineCategoryEditor from './InlineCategoryEditor';
import InlineTypeEditor from './InlineTypeEditor';

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
    const theme = useThemeClasses();
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    const handleSelectTransaction = (id: string) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedTransactions.size === transactions.length) {
            setSelectedTransactions(new Set());
        } else {
            setSelectedTransactions(new Set(transactions.map(t => t.id)));
        }
    };

    const getTypeColor = (type: string) => {
        return type === 'income'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
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
                                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
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
                    {transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className={theme.table}>
                                <thead className="sticky top-0 z-10">
                                    <tr>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs')}>
                                            <button
                                                onClick={handleSelectAll}
                                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            >
                                                {selectedTransactions.size === transactions.length ? (
                                                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </th>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs')}>Date</th>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs')}>Description</th>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs')}>Category</th>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs')}>Type</th>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs text-right')}>Amount</th>
                                        <th className={cn(theme.tableHeader, '!py-1 !px-2 text-xs text-right')}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction) => (
                                        <tr
                                            key={transaction.id}
                                            onClick={() => onTransactionClick?.(transaction)}
                                            className={cn(
                                                theme.tableRow,
                                                'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
                                                selectedTransactions.has(transaction.id) && 'bg-blue-50 dark:bg-blue-900/30'
                                            )}
                                        >
                                            <td className={cn(theme.tableCell, '!py-1 !px-2')}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectTransaction(transaction.id);
                                                    }}
                                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                                                >
                                                    {selectedTransactions.has(transaction.id) ? (
                                                        <CheckSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                    ) : (
                                                        <Square className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className={cn(theme.tableCell, '!py-1 !px-2 whitespace-nowrap text-xs')}>
                                                <span className={theme.textPrimary}>{formatDate(transaction.date)}</span>
                                            </td>
                                            <td className={cn(theme.tableCell, '!py-1 !px-2 text-xs font-medium max-w-xs truncate')} title={transaction.description}>
                                                <span className={theme.textPrimary}>{transaction.description}</span>
                                            </td>
                                            <td className={cn(theme.tableCell, '!py-1 !px-2 whitespace-nowrap text-xs')}>
                                                {onUpdateTransaction ? (
                                                    <InlineCategoryEditor
                                                        currentCategory={transaction.category || 'other'}
                                                        onSave={(categoryId) => onUpdateTransaction(transaction.id, { category: categoryId })}
                                                    />
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px]">
                                                        {transaction.category}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={cn(theme.tableCell, '!py-1 !px-2 whitespace-nowrap')}>
                                                {onUpdateTransaction ? (
                                                    <InlineTypeEditor
                                                        currentType={transaction.type}
                                                        onSave={(newType) => onUpdateTransaction(transaction.id, { type: newType })}
                                                    />
                                                ) : (
                                                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                                                        {transaction.type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={cn(theme.tableCell, '!py-1 !px-2 whitespace-nowrap text-xs text-right font-medium')}>
                                                <span className={transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                </span>
                                            </td>
                                            <td className={cn(theme.tableCell, '!py-1 !px-2 whitespace-nowrap text-right text-xs font-medium')}>
                                                <div className="flex justify-end gap-1">
                                                    {onTransactionClick && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onTransactionClick(transaction);
                                                            }}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                            title="Edit Transaction"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {onDeleteTransaction && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteTransaction(transaction.id);
                                                            }}
                                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            title="Delete Transaction"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full py-16">
                            <div className="text-center">
                                <div className="text-gray-300 dark:text-gray-600 mb-3">
                                    <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                                    No transactions found
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TransactionListOverlay;
