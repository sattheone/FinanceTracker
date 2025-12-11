import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, ToggleRight } from 'lucide-react';
import { Transaction, CategoryRule } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CategoryRuleService from '../../services/categoryRuleService';

interface RuleCreationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    newCategoryId?: string;
    newCategoryName?: string;
    newType?: Transaction['type'];
    newTypeName?: string;
    transactions: Transaction[]; // All transactions for preview
    onCreateRule: (rule: Omit<CategoryRule, 'id'>) => void;
}

const RuleCreationDialog: React.FC<RuleCreationDialogProps> = ({
    isOpen,
    onClose,
    transaction,
    newCategoryId,
    newCategoryName,
    newType,
    transactions,
    onCreateRule
}) => {
    const [matchType, setMatchType] = useState<'partial' | 'exact'>('partial');
    const [pattern, setPattern] = useState(transaction.description);
    const [includeType, setIncludeType] = useState(false);

    // Determine the target type (either from props or defaulting to transaction's current/new type)
    const [selectedType, setSelectedType] = useState<Transaction['type']>(newType || transaction.type);

    // Update selected type if props change
    useEffect(() => {
        if (newType) {
            setSelectedType(newType);
        }
    }, [newType]);

    // Create temporary rule for preview (only for category changes)
    const previewRule: CategoryRule | null = useMemo(() => {
        if (!newCategoryId) return null;
        return {
            id: 'preview',
            name: pattern,
            categoryId: newCategoryId,
            transactionType: includeType ? selectedType : undefined,
            matchType,
            createdAt: new Date().toISOString(),
            matchCount: 0,
            isActive: true
        };
    }, [pattern, newCategoryId, matchType, includeType, selectedType]);

    // Get preview of matching transactions
    const preview = useMemo(() => {
        if (!previewRule) return { matchCount: 0, sampleTransactions: [] };
        return CategoryRuleService.getRulePreview(transactions, previewRule);
    }, [transactions, previewRule]);

    const handleSubmit = () => {
        if (!newCategoryId) return;
        const rule = CategoryRuleService.createRuleFromTransaction(
            { ...transaction, description: pattern },
            newCategoryId,
            matchType,
            includeType ? selectedType : undefined
        );
        onCreateRule(rule);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            {/* Dialog */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Create Categorization Rule
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Automatically categorize similar transactions
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Pattern Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Transaction Pattern
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={pattern}
                                    onChange={(e) => setPattern(e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white font-mono text-sm"
                                    placeholder="Enter transaction pattern..."
                                />
                            </div>
                        </div>

                        {/* Match Type Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Match Type
                            </label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setMatchType('partial')}
                                    className={`flex-1 flex items-center justify-between p-4 rounded-lg border-2 transition-all ${matchType === 'partial'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="text-left">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900 dark:text-white">Partial Match</span>
                                            {matchType === 'partial' && (
                                                <ToggleRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Matches if description contains this pattern
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setMatchType('exact')}
                                    className={`flex-1 flex items-center justify-between p-4 rounded-lg border-2 transition-all ${matchType === 'exact'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="text-left">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900 dark:text-white">Exact Match</span>
                                            {matchType === 'exact' && (
                                                <ToggleRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Only matches exact description
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Rule Actions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Rule Actions
                            </label>
                            <div className="space-y-3">
                                {/* Category Action */}
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
                                        Set Category to:
                                    </p>
                                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                                        {newCategoryName}
                                    </p>
                                </div>

                                {/* Transaction Type Action Toggle */}
                                <div
                                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${includeType
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setIncludeType(!includeType)}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-gray-900 dark:text-white">Also Change Transaction Type</span>
                                                {includeType && (
                                                    <ToggleRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                )}
                                            </div>
                                            {!includeType && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Set matching transactions to type: <span className="font-semibold capitalize">{selectedType}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {includeType && (
                                        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800/30 animate-fade-in">
                                            <label className="block text-xs font-medium text-purple-900 dark:text-purple-300 mb-2 uppercase tracking-wide">
                                                Set matching transactions to type:
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['expense', 'income', 'investment', 'insurance'] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setSelectedType(type)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors capitalize ${selectedType === type
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Preview Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Impact Preview
                                </span>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-3">
                                <p className="text-sm text-blue-900 dark:text-blue-300">
                                    This rule will apply to <span className="font-bold">{preview.matchCount}</span> past transaction{preview.matchCount !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {preview.sampleTransactions.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        Sample Transactions ({Math.min(preview.matchCount, 10)} of {preview.matchCount})
                                    </p>
                                    <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-750">
                                        {preview.sampleTransactions.map((t) => (
                                            <div
                                                key={t.id}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {t.description}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {formatDate(t.date)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 ml-4">
                                                    {includeType && t.type !== selectedType && (
                                                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                                            {t.type} → {selectedType}
                                                        </span>
                                                    )}
                                                    <p className={`font-semibold ${t.type === 'income'
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
                        >
                            Create Rule & Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RuleCreationDialog;
