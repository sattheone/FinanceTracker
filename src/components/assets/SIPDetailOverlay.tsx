import React, { useState } from 'react';
import { X, Edit3, Trash2, Calendar, ExternalLink, Link as LinkIcon, Plus } from 'lucide-react';
import { Asset, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn, useThemeClasses } from '../../hooks/useThemeClasses';

interface SIPDetailOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset;
    transactions: Transaction[];
    onEditAsset: () => void;
    onUnlinkTransaction: (transaction: Transaction) => void;
    onLinkTransaction: () => void;
}

const SIPDetailOverlay: React.FC<SIPDetailOverlayProps> = ({
    isOpen,
    onClose,
    asset,
    transactions,
    onEditAsset,
    onUnlinkTransaction,
    onLinkTransaction
}) => {
    const theme = useThemeClasses();
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    // Derived Metrics
    const investedAmount = asset.investedValue || 0;
    const currentVal = asset.currentValue || 0;
    const returns = currentVal - investedAmount;
    const returnsPercent = investedAmount > 0 ? (returns / investedAmount) * 100 : 0;

    // Calculate Next Due Date (Simple approximation based on sipDate)
    const getNextDueDate = () => {
        if (!asset.sipDate) return 'N/A';
        const today = new Date();
        const currentMonthSip = new Date(today.getFullYear(), today.getMonth(), asset.sipDate);
        if (today > currentMonthSip) {
            // Next month
            return formatDate(new Date(today.getFullYear(), today.getMonth() + 1, asset.sipDate).toISOString());
        }
        return formatDate(currentMonthSip.toISOString());
    };

    const linkedTransactions = transactions.filter(t =>
        t.isLinked && t.entityLinks?.some(link => link.type === 'asset' && link.id === asset.id)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const displayTransactions = linkedTransactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.amount.toString().includes(searchTerm)
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div
                className={cn(
                    "fixed right-0 top-0 bottom-0 w-full md:w-[800px]",
                    "bg-white dark:bg-gray-800 shadow-2xl z-[70] overflow-hidden flex flex-col",
                    "transform transition-all duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex-shrink-0 h-16 px-6 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {asset.name}
                            {(asset as any).isSIP && (
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                    SIP
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-500">{asset.category.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onEditAsset}
                            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="Edit SIP Details"
                        >
                            <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(currentVal)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Invested Amount</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(investedAmount)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Returns</p>
                            <div className={`text-xl font-bold ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {returns >= 0 ? '+' : ''}{formatCurrency(returns)}
                                <span className="text-xs ml-1 font-normal opacity-80">
                                    ({returnsPercent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> Next SIP Date
                            </p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{getNextDueDate()}</p>
                        </div>
                    </div>

                    {/* Transactions Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[500px]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <ExternalLink className="w-5 h-5 text-gray-500" />
                                Transaction History
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                                    {linkedTransactions.length}
                                </span>
                            </h3>
                            <button
                                onClick={onLinkTransaction}
                                className="flex items-center space-x-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Link Transaction</span>
                            </button>
                        </div>

                        {/* Search Bar - Optional, simple filter */}
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={cn(theme.input, 'w-full text-sm py-1.5')}
                            />
                        </div>

                        <div className="flex-1 overflow-auto">
                            {displayTransactions.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Date</th>
                                            <th className="px-4 py-3 font-medium">Description</th>
                                            <th className="px-4 py-3 font-medium text-right">Amount</th>
                                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {displayTransactions.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {formatDate(t.date)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium truncate max-w-[200px]" title={t.description}>
                                                    {t.description}
                                                    <div className="text-xs text-gray-400 font-normal">{t.category}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                    {formatCurrency(t.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => onUnlinkTransaction(t)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        title="Unlink Transaction"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <LinkIcon className="w-12 h-12 mb-2 opacity-20" />
                                    <p>No linked transactions found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SIPDetailOverlay;
