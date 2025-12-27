import React, { useState, useMemo } from 'react';
import { Edit3, Trash2, CheckSquare, Square, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { cn, useThemeClasses } from '../../hooks/useThemeClasses';
import InlineCategoryEditor from './InlineCategoryEditor';
import InlineTypeEditor from './InlineTypeEditor';
import { useData } from '../../contexts/DataContext';

interface TransactionTableProps {
    transactions: Transaction[];
    selectedTransactions?: Set<string>;
    onSelectTransaction?: (id: string) => void;
    onSelectAll?: () => void;
    onTransactionClick?: (transaction: Transaction) => void;
    onDeleteTransaction?: (transactionId: string) => void;
    onUpdateTransaction?: (transactionId: string, updates: Partial<Transaction>) => void;
    onContextMenu?: (e: React.MouseEvent, transaction: Transaction) => void;
}

type SortKey = 'date' | 'description' | 'category' | 'type' | 'amount';
type SortDirection = 'asc' | 'desc';

const TransactionTable: React.FC<TransactionTableProps> = ({
    transactions,
    selectedTransactions = new Set(),
    onSelectTransaction,
    onSelectAll,
    onTransactionClick,
    onDeleteTransaction,
    onUpdateTransaction,
    onContextMenu
}) => {
    const theme = useThemeClasses();
    const { categories } = useData();
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'date',
        direction: 'desc'
    });

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedTransactions = useMemo(() => {
        const sorted = [...transactions];
        return sorted.sort((a, b) => {
            let aValue: any = a[sortConfig.key];
            let bValue: any = b[sortConfig.key];

            // Special handling for category to sort by name instead of ID
            if (sortConfig.key === 'category') {
                const aCatName = categories?.find(c => c.id === a.category)?.name || a.category || '';
                const bCatName = categories?.find(c => c.id === b.category)?.name || b.category || '';
                aValue = aCatName.toLowerCase();
                bValue = bCatName.toLowerCase();
            } else if (sortConfig.key === 'description' || sortConfig.key === 'type') {
                aValue = (aValue || '').toLowerCase();
                bValue = (bValue || '').toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, sortConfig, categories]);

    const handleSelectTransaction = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectTransaction?.(id);
    };

    const handleSelectAllClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectAll?.();
    };

    const getTypeColor = (type: string) => {
        return type === 'income'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-50 transition-opacity ml-1" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400 ml-1" />
            : <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400 ml-1" />;
    };

    const HeaderCell = ({ column, label, align = 'left' }: { column: SortKey; label: string; align?: 'left' | 'right' }) => (
        <th
            className={cn(
                theme.tableHeader,
                '!py-2 !px-3 text-xs cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group',
                align === 'right' && 'text-right'
            )}
            onClick={() => handleSort(column)}
        >
            <div className={cn("flex items-center", align === 'right' && "justify-end")}>
                {label}
                <SortIcon column={column} />
            </div>
        </th>
    );

    if (transactions.length === 0) {
        return (
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
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className={theme.table}>
                <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        {onSelectAll && (
                            <th className={cn(theme.tableHeader, '!py-2 !px-3 text-xs w-10')}>
                                <button
                                    onClick={handleSelectAllClick}
                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center"
                                >
                                    {selectedTransactions.size > 0 && selectedTransactions.size === transactions.length ? (
                                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                        <Square className="w-4 h-4" />
                                    )}
                                </button>
                            </th>
                        )}
                        <HeaderCell column="date" label="Date" />
                        <HeaderCell column="description" label="Description" />
                        <HeaderCell column="category" label="Category" />
                        <HeaderCell column="type" label="Type" />
                        <HeaderCell column="amount" label="Amount" align="right" />
                        <th className={cn(theme.tableHeader, '!py-2 !px-3 text-xs text-right')}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTransactions.reduce((acc: React.ReactNode[], transaction, index) => {
                        const date = new Date(transaction.date);
                        const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        const prevTransaction = sortedTransactions[index - 1];
                        const prevMonthKey = prevTransaction
                            ? new Date(prevTransaction.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : '';

                        if (sortConfig.key === 'date' && monthKey !== prevMonthKey) {
                            acc.push(
                                <tr key={`header-${monthKey}`} className="bg-white dark:bg-gray-900/50">
                                    <td colSpan={10} className={cn(theme.textPrimary, "px-3 py-2 text-sm font-bold")}>
                                        {monthKey}
                                    </td>
                                </tr>
                            );
                        }

                        acc.push(
                            <tr
                                key={transaction.id}
                                onClick={() => onTransactionClick?.(transaction)}
                                onContextMenu={(e) => onContextMenu?.(e, transaction)}
                                className={cn(
                                    theme.tableRow,
                                    'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                                    selectedTransactions.has(transaction.id) && 'bg-blue-50 dark:bg-blue-900/30'
                                )}
                            >
                                {onSelectTransaction && (
                                    <td className={cn(theme.tableCell, '!py-2 !px-3 w-10')}>
                                        <button
                                            onClick={(e) => handleSelectTransaction(transaction.id, e)}
                                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                                        >
                                            {selectedTransactions.has(transaction.id) ? (
                                                <CheckSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <Square className="w-3 h-3" />
                                            )}
                                        </button>
                                    </td>
                                )}
                                <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap text-xs')}>
                                    <span className={theme.textPrimary}>
                                        {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                </td>
                                <td className={cn(theme.tableCell, '!py-2 !px-3 text-xs font-medium max-w-xs truncate')} title={transaction.description}>
                                    <span className={theme.textPrimary}>{transaction.description}</span>
                                </td>
                                <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap text-xs')}>
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
                                <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap')}>
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
                                <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap text-xs text-right font-medium')}>
                                    <span className={transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                    </span>
                                </td>
                                <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap text-right text-xs font-medium')}>
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
                        );
                        return acc;
                    }, [])}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionTable;
