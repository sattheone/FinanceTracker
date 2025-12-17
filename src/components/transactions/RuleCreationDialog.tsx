import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, ToggleRight } from 'lucide-react';
import { Transaction, CategoryRule } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CategoryRuleService from '../../services/categoryRuleService';

interface RuleCreationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: Transaction; // Optional for edit mode
    initialRule?: CategoryRule; // For editing
    newCategoryId?: string;
    newType?: Transaction['type'];
    transactions: Transaction[]; // All transactions for preview
    categories: any[]; // Passed from parent
    onCreateRule?: (rule: Omit<CategoryRule, 'id'>) => void;
    onEditRule?: (rule: CategoryRule) => void;
}

const RuleCreationDialog: React.FC<RuleCreationDialogProps> = ({
    isOpen,
    onClose,
    transaction,
    initialRule,
    newCategoryId,
    newType,
    transactions,
    categories,
    onCreateRule,
    onEditRule
}) => {
    const isEditMode = !!initialRule;

    // Initialize state from initialRule OR transaction defaults
    const [matchType, setMatchType] = useState<'partial' | 'exact'>(
        initialRule?.matchType || 'partial'
    );

    const [pattern, setPattern] = useState(
        initialRule?.name || transaction?.description || ''
    );

    // Initialize selected category
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        initialRule?.categoryId || newCategoryId || ''
    );

    // Determines target type
    const [selectedType, setSelectedType] = useState<Transaction['type']>(
        initialRule?.transactionType || newType || transaction?.type || 'expense'
    );

    // Sanitization helper
    const sanitizePattern = (text: string) => {
        if (!text) return '';
        // Remove dates (dd/mm/yy, yyyy-mm-dd, etc)
        let clean = text.replace(/\d{2,4}[\/\-]\d{2}[\/\-]\d{2,4}/g, '');
        // Remove long number sequences (IDs, Refs) > 3 digits
        clean = clean.replace(/\b\d{4,}\b/g, '');
        // Remove common reference prefixes
        clean = clean.replace(/(UPI|REF|NEFT|IMPS)-?/gi, '');
        // Trim special chars and whitespace
        return clean.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Update state if props change (re-opening dialog)
    useEffect(() => {
        if (isOpen) {
            if (initialRule) {
                setMatchType(initialRule.matchType);
                setPattern(initialRule.name);
                setSelectedCategoryId(initialRule.categoryId);
                setSelectedType(initialRule.transactionType || 'expense');
            } else if (transaction) {
                if (newCategoryId) setSelectedCategoryId(newCategoryId);
                if (newType) setSelectedType(newType);
                setPattern(sanitizePattern(transaction.description));
            }
        }
    }, [isOpen, initialRule, transaction, newCategoryId, newType]);

    // Create temporary rule for preview
    const previewRule: CategoryRule | null = useMemo(() => {
        if (!selectedCategoryId) return null;
        return {
            id: initialRule?.id || 'preview',
            name: pattern,
            categoryId: selectedCategoryId,
            transactionType: selectedType,
            matchType,
            createdAt: initialRule?.createdAt || new Date().toISOString(),
            matchCount: initialRule?.matchCount || 0,
            isActive: true
        };
    }, [pattern, selectedCategoryId, matchType, selectedType, initialRule]);

    // Get preview of matching transactions
    const preview = useMemo(() => {
        if (!previewRule) return { matchCount: 0, sampleTransactions: [] };
        return CategoryRuleService.getRulePreview(transactions, previewRule);
    }, [transactions, previewRule]);

    const handleSubmit = () => {
        if (!selectedCategoryId) return;

        if (isEditMode && initialRule && onEditRule) {
            const updatedRule: CategoryRule = {
                ...initialRule,
                name: pattern,
                categoryId: selectedCategoryId,
                transactionType: selectedType,
                matchType,
                // isActive state is preserved from initialRule usually, or we can assume true if editing
            };
            onEditRule(updatedRule);
        } else if (onCreateRule) {
            // Create new rule
            const rule: Omit<CategoryRule, 'id'> = {
                name: pattern,
                categoryId: selectedCategoryId,
                transactionType: selectedType,
                matchType,
                isActive: true,
                createdAt: new Date().toISOString(),
                matchCount: 0,
                lastUsed: new Date().toISOString()
            };
            onCreateRule(rule);
        }

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
                                {isEditMode ? 'Edit Rule' : 'Create Categorization Rule'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {isEditMode ? 'Modify how subsequent transactions are categorized' : 'Automatically categorize similar transactions'}
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
                            <div className="grid grid-cols-2 gap-4">
                                {/* Category Selection */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Set Category
                                    </label>
                                    <select
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-white"
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Transaction Type Selection */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Set Transaction Type
                                    </label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value as Transaction['type'])}
                                        className="w-full p-2.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-white capitalize"
                                    >
                                        {['expense', 'income', 'investment', 'insurance'].map(type => (
                                            <option key={type} value={type} className="capitalize">
                                                {type}
                                            </option>
                                        ))}
                                    </select>
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
                                                    {t.type !== selectedType && (
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
                            {isEditMode ? 'Save Changes' : 'Create Rule & Apply'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RuleCreationDialog;
