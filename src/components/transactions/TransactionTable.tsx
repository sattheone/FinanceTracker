import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Edit3, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Tag, MoreHorizontal, Folder, TrendingUp } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { cn, useThemeClasses } from '../../hooks/useThemeClasses';
import InlineCategoryEditor from './InlineCategoryEditor';
import InlineTypeEditor from './InlineTypeEditor';
import { useData } from '../../contexts/DataContext';

interface TransactionTableProps {
    transactions: Transaction[];
    selectedTransactions?: Set<string>;
    onSelectTransaction?: (id: string, select?: boolean) => void;
    onSelectTransactionsRange?: (ids: string[], select: boolean) => void;
    onSelectAll?: () => void;
    onClearSelection?: () => void;
    onTransactionClick?: (transaction: Transaction) => void;
    onDeleteTransaction?: (transactionId: string) => void;
    onUpdateTransaction?: (transactionId: string, updates: Partial<Transaction>) => void;
    onContextMenu?: (e: React.MouseEvent, transaction: Transaction) => void;
    onTagClick?: (transaction: Transaction, anchorElement: HTMLElement) => void;
    // Bulk action triggers
    onBulkCategoryClick?: (anchorElement: HTMLElement) => void;
    onBulkTagClick?: (anchorElement: HTMLElement) => void;
    onBulkTypeClick?: (anchorElement: HTMLElement) => void;
    onBulkDelete?: () => void;
}

type SortKey = 'date' | 'description' | 'category' | 'type' | 'amount';
type SortDirection = 'asc' | 'desc';

const TransactionTable: React.FC<TransactionTableProps> = ({
    transactions,
    selectedTransactions = new Set(),
    onSelectTransaction,
    onSelectTransactionsRange,
    onSelectAll,
    onTransactionClick,
    onDeleteTransaction,
    onUpdateTransaction,
    onContextMenu,
    onTagClick,
    onBulkCategoryClick,
    onBulkTagClick,
    // onBulkTypeClick,
    onBulkDelete,
    onClearSelection
}) => {
    const theme = useThemeClasses();
    const { categories, tags } = useData();
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'date',
        direction: 'desc'
    });
    const [hoveredTransactionId, setHoveredTransactionId] = useState<string | null>(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const [typeOpen, setTypeOpen] = useState(false);
    const moreContainerRef = useRef<HTMLDivElement | null>(null);
    const typeContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!moreOpen && !typeOpen) return;
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const inMore = moreContainerRef.current?.contains(target);
            const inType = typeContainerRef.current?.contains(target);
            if (!inMore && !inType) {
                setMoreOpen(false);
                setTypeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [moreOpen, typeOpen]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const tableTransactions = useMemo(() => transactions.filter(t => !t.isSplitParent), [transactions]);
    const sortedTransactions = useMemo(() => {
        const sorted = [...tableTransactions];
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
    }, [tableTransactions, sortConfig, categories]);

    const selectedTxns = useMemo(() => tableTransactions.filter(t => selectedTransactions.has(t.id)), [tableTransactions, selectedTransactions]);
    const bulkCommonType = useMemo(() => {
        if (selectedTxns.length === 0) return undefined;
        const t0 = selectedTxns[0].type;
        return selectedTxns.every(t => t.type === t0) ? t0 : undefined;
    }, [selectedTxns]);

    const lastClickedIndexRef = useRef<number | null>(null);

    const handleSelectTransaction = (id: string, index: number, e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const select = (e.currentTarget as HTMLInputElement).checked;

        if (e.shiftKey && lastClickedIndexRef.current !== null) {
            const start = Math.min(lastClickedIndexRef.current, index);
            const end = Math.max(lastClickedIndexRef.current, index);
            const idsInRange = sortedTransactions.slice(start, end + 1).map(t => t.id);
            if (onSelectTransactionsRange) {
                onSelectTransactionsRange(idsInRange, select);
            } else if (onSelectTransaction) {
                // Fallback: apply individually with desired select state
                idsInRange.forEach(rid => onSelectTransaction(rid, select));
            }
        } else {
            onSelectTransaction?.(id, select);
        }

        lastClickedIndexRef.current = index;
    };

    const handleSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    return (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className={cn(theme.tableHeader, '!py-2 !px-3 text-xs w-10')}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTransactions.size > 0 && selectedTransactions.size === tableTransactions.length}
                                        onChange={handleSelectAllClick}
                                        className="cursor-pointer"
                                    />
                                </th>
                                <HeaderCell column="date" label="Date" />
                                <HeaderCell column="description" label="Description" />
                                <HeaderCell column="category" label="Category" />
                                <HeaderCell column="type" label="Type" />
                                <HeaderCell column="amount" label="Amount" align="right" />
                                <th className={cn(theme.tableHeader, '!py-2 !px-3 text-xs w-20')}>Tags</th>
                                <th className={cn(theme.tableHeader, '!py-2 !px-3 text-xs w-24 text-right')}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransactions.map((transaction, index) => {
                                const date = new Date(transaction.date);
                                return (
                                    <tr
                                        key={transaction.id}
                                        onMouseEnter={() => setHoveredTransactionId(transaction.id)}
                                        onMouseLeave={() => setHoveredTransactionId(null)}
                                        onContextMenu={(e) => onContextMenu?.(e, transaction)}
                                        onClick={() => onTransactionClick?.(transaction)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/40"
                                    >
                                        <td className={cn(theme.tableCell, '!py-2 !px-3 text-xs w-10')}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTransactions.has(transaction.id)}
                                                onClick={(e) => handleSelectTransaction(transaction.id, index, e)}
                                                className="cursor-pointer"
                                            />
                                        </td>
                                        <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap text-xs')}>
                                            <span className={theme.textPrimary}>
                                                {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </td>
                                        <td className={cn(theme.tableCell, '!py-2 !px-3 text-xs font-medium max-w-xs')} title={transaction.description}>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(theme.textPrimary, 'truncate')}>{transaction.description}</span>
                                            </div>
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
                                                    allowUnchanged={false}
                                                    onSave={(newType) => {
                                                        if (newType === 'unchanged') return;
                                                        onUpdateTransaction(transaction.id, { type: newType });
                                                    }}
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
                                        <td className={cn(theme.tableCell, '!py-2 !px-2 whitespace-nowrap')}>
                                            {transaction.tags && transaction.tags.length > 0 ? (
                                                (() => {
                                                    const resolved = (transaction.tags || [])
                                                        .map((id) => tags.find(t => t.id === id))
                                                        .filter((t): t is NonNullable<typeof t> => !!t);
                                                    const count = resolved.length;
                                                    if (count === 0) return <div className="h-5" />;
                                                    const visible = resolved.slice(0, Math.min(3, count));
                                                    const label = count > 3 ? '3+' : String(count);
                                                    return (
                                                        <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5">
                                                            <div className="flex -space-x-1 mr-1">
                                                                {visible.map((tag) => (
                                                                    <span
                                                                        key={tag.id}
                                                                        className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-gray-800"
                                                                        style={{ backgroundColor: tag.color }}
                                                                        title={tag.name}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] text-gray-700 dark:text-gray-300 font-medium">{label}</span>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="h-5" />
                                            )}
                                        </td>
                                        <td className={cn(theme.tableCell, '!py-2 !px-3 whitespace-nowrap text-right text-xs font-medium')}>
                                            <div className="flex justify-end gap-1">
                                                {onTagClick && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTagClick(transaction, e.currentTarget);
                                                        }}
                                                        className={cn(
                                                            "text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-opacity",
                                                            hoveredTransactionId === transaction.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                        title="Manage Tags"
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                    </button>
                                                )}
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
                            })}
                        </tbody>
                    </table>

                    {/* Floating bulk actions bar */}
                    {selectedTransactions.size > 0 && (
                        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
                            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {selectedTransactions.size} selected
                                </span>
                                <button
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                                    onClick={(e) => onBulkCategoryClick?.(e.currentTarget)}
                                >
                                    <Folder className="w-4 h-4" />
                                    Category
                                </button>
                                <button
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                                    onClick={(e) => onBulkTagClick?.(e.currentTarget)}
                                >
                                    <Tag className="w-4 h-4" />
                                    Tag
                                </button>
                                <div className="relative" ref={typeContainerRef}>
                                    <InlineTypeEditor
                                        currentType={bulkCommonType || 'expense'}
                                        allowUnchanged={false}
                                        onSave={(newType) => {
                                            if (!onUpdateTransaction || newType === 'unchanged') return;
                                            transactions.forEach(t => {
                                                if (selectedTransactions.has(t.id)) {
                                                    onUpdateTransaction(t.id, { type: newType });
                                                }
                                            });
                                        }}
                                        onCancel={() => setTypeOpen(false)}
                                        triggerClassName={"inline-flex items-center gap-2 h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"}
                                        triggerContent={(
                                            <>
                                                <TrendingUp className="w-4 h-4" />
                                                <span>Type</span>
                                            </>
                                        )}
                                    />
                                </div>
                                {/* More menu */}
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
                                                        onSelectAll?.();
                                                        setMoreOpen(false);
                                                    }}
                                                >
                                                    Select all
                                                </button>
                                                <button
                                                    className={cn(theme.dropdownItem, "w-full text-left text-sm")}
                                                    onClick={() => {
                                                        onClearSelection?.();
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
                                                            onBulkDelete?.();
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
        </div>
    );
};

export default TransactionTable;
