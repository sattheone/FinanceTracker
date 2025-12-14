import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Modal from '../common/Modal';
import { useData } from '../../contexts/DataContext';

interface TransactionSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (transaction: Transaction) => void;
}

const TransactionSelectorModal: React.FC<TransactionSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect
}) => {
    const theme = useThemeClasses();
    const { transactions } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = transactions
        .filter(t =>
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.amount.toString().includes(searchTerm) ||
            (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50); // Limit to top 50 matches for performance

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Base Transaction"
            size="lg"
        >
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by description, amount, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(theme.input, 'w-full pl-9 py-2')}
                        autoFocus
                    />
                </div>

                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    {filteredTransactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No transactions found matching "{searchTerm}"
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Description</th>
                                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                                    <th className="px-4 py-3 font-medium text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredTransactions.map(t => (
                                    <tr
                                        key={t.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group"
                                        onClick={() => onSelect(t)}
                                    >
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {formatDate(t.date)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                            <div className="truncate max-w-[200px]" title={t.description}>
                                                {t.description}
                                            </div>
                                            <div className="text-xs text-gray-400 font-normal">{t.category}</div>
                                        </td>
                                        <td className={cn(
                                            "px-4 py-3 text-right font-medium",
                                            t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                                        )}>
                                            {formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Select a transaction to use its details as a template for the recurring rule.
                </p>
            </div>
        </Modal>
    );
};

export default TransactionSelectorModal;
