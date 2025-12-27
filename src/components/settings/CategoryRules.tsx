import React, { useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, AlertCircle, Plus, Edit3, Play } from 'lucide-react';
import { CategoryRule, Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import RuleCreationDialog from '../transactions/RuleCreationDialog';
import AutoCategorizationService from '../../services/autoCategorization';

const CategoryRules: React.FC = () => {
    const theme = useThemeClasses();
    const { categoryRules, deleteCategoryRule, updateCategoryRule, addCategoryRule, transactions, categories: contextCategories, updateTransaction } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    // Use categories from context
    const categories = contextCategories || [];
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);

    // Removed localstorage loading effect

    const getCategoryName = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : categoryId;
    };

    const filteredRules = categoryRules.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryName(rule.categoryId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleActive = (rule: CategoryRule) => {
        updateCategoryRule(rule.id, { isActive: !rule.isActive });
    };

    const handleDelete = (ruleId: string) => {
        if (window.confirm('Are you sure you want to delete this rule?')) {
            deleteCategoryRule(ruleId);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Dummy transaction for manual rule creation
    const dummyTransaction: Transaction = {
        id: 'new-rule',
        description: '',
        amount: 0,
        date: new Date().toISOString(),
        category: '',
        type: 'expense',
        bankAccountId: '',
        tags: []
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={cn(theme.heading2, 'mb-2')}>Category Rules</h2>
                    <p className={theme.textSecondary}>
                        Manage auto-categorization rules for transactions
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (!window.confirm('This will scan all past transactions and apply your active rules. Existing categories might be overwritten if a rule matches. Continue?')) return;

                            let updatedCount = 0;
                            const updates: Record<string, Partial<Transaction>> = {};
                            const activeRules = categoryRules.filter(r => r.isActive);

                            // Optimization: Build a rule matcher function or just loop
                            transactions.forEach(t => {
                                // Find best matching rule
                                const result = AutoCategorizationService.suggestCategoryForTransaction(
                                    t.description,
                                    t.amount,
                                    t.type as any,
                                    activeRules
                                );

                                if (result.appliedRule) {
                                    // If rule matches, check if we need to update
                                    // Update if:
                                    // 1. Category is different 
                                    // 2. OR Category is same but 'appliedRule' metadata is missing (Backfill attribution)
                                    const needsUpdate = t.category !== result.categoryId || !t.appliedRule || t.appliedRule.id !== result.appliedRule.id;

                                    if (needsUpdate) {
                                        updates[t.id] = {
                                            category: result.categoryId,
                                            appliedRule: result.appliedRule
                                        };
                                        updatedCount++;
                                    }
                                }
                            });

                            if (updatedCount > 0) {
                                // Process updates (Bulk update not directly available as object map in context, need loop or specialized bulk)
                                // Context provides bulkUpdateTransactions(ids[], update). But we have DIFFERENT updates per ID.
                                // So we must use single updates or improved bulk.
                                // Actually dataContext has `updateTransaction`.
                                // For performance, maybe chunked? 
                                // Let's use Promise.all with chunking to avoid overwhelming Firestore.
                                let processed = 0;
                                const transactionIds = Object.keys(updates);
                                const BATCH_SIZE = 50;

                                for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
                                    const batch = transactionIds.slice(i, i + BATCH_SIZE);
                                    await Promise.all(batch.map(id => updateTransaction(id, updates[id])));
                                    processed += batch.length;
                                }
                                alert(`Successfully updated ${updatedCount} transactions.`);
                            } else {
                                alert('No transactions matched new rules.');
                            }
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Play className="w-4 h-4" />
                        <span>Run Rules</span>
                    </button>
                    <button
                        onClick={() => setShowAddDialog(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Rule</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div>
                <input
                    type="text"
                    placeholder="Search rules by pattern or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field theme-input w-full md:w-96"
                />
            </div>

            {/* Rules List */}
            {filteredRules.length === 0 ? (
                <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className={cn(theme.heading3, 'mb-2')}>
                        {categoryRules.length === 0 ? 'No Rules Created Yet' : 'No Matching Rules'}
                    </h3>
                    <p className={theme.textSecondary}>
                        {categoryRules.length === 0
                            ? 'Rules will appear here after you create them by changing transaction categories'
                            : 'Try a different search term'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className={theme.table}>
                        <thead>
                            <tr>
                                <th className={theme.tableHeader}>Pattern</th>
                                <th className={theme.tableHeader}>Match Type</th>
                                <th className={theme.tableHeader}>Category</th>
                                <th className={theme.tableHeader}>Matches</th>
                                <th className={theme.tableHeader}>Last Used</th>
                                <th className={theme.tableHeader}>Status</th>
                                <th className={theme.tableHeader}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRules.map((rule) => (
                                <tr key={rule.id} className={theme.tableRow}>
                                    <td className={cn(theme.tableCell, 'font-medium')}>
                                        <span className={theme.textPrimary}>{rule.name}</span>
                                    </td>
                                    <td className={theme.tableCell}>
                                        <span className={cn(
                                            'px-2 py-1 rounded-full text-xs font-medium',
                                            rule.matchType === 'exact'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                        )}>
                                            {rule.matchType === 'exact' ? 'Exact' : 'Partial'}
                                        </span>
                                    </td>
                                    <td className={theme.tableCell}>
                                        <span className={theme.textPrimary}>
                                            {getCategoryName(rule.categoryId)}
                                        </span>
                                    </td>
                                    <td className={theme.tableCell}>
                                        <span className={theme.textSecondary}>{rule.matchCount}</span>
                                    </td>
                                    <td className={theme.tableCell}>
                                        <span className={theme.textSecondary}>
                                            {formatDate(rule.lastUsed)}
                                        </span>
                                    </td>
                                    <td className={theme.tableCell}>
                                        <button
                                            onClick={() => handleToggleActive(rule)}
                                            className={cn(
                                                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                                                rule.isActive
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            )}
                                        >
                                            {rule.isActive ? (
                                                <>
                                                    <ToggleRight className="w-4 h-4" />
                                                    Active
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-4 h-4" />
                                                    Inactive
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className={theme.tableCell}>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingRule(rule)}
                                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                title="Edit Rule"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                title="Delete Rule"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    How Rules Work
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <li>• <strong>Partial Match:</strong> Rule applies if transaction description contains the pattern</li>
                    <li>• <strong>Exact Match:</strong> Rule applies only if transaction description exactly matches the pattern</li>
                    <li>• Active rules automatically categorize new transactions</li>
                    <li>• Create rules by changing transaction categories and clicking "Create Rule"</li>
                    <li>• Rules can now also set the Transaction Type (e.g. Income vs Expense)</li>
                </ul>
            </div>

            {/* Manual Rule Creation/Edit Dialog */}
            {(showAddDialog || editingRule) && (
                <RuleCreationDialog
                    isOpen={showAddDialog || !!editingRule}
                    onClose={() => {
                        setShowAddDialog(false);
                        setEditingRule(null);
                    }}
                    transaction={dummyTransaction}
                    initialRule={editingRule || undefined}
                    transactions={transactions}
                    categories={categories}
                    onCreateRule={(rule) => {
                        addCategoryRule(rule);
                        setShowAddDialog(false);
                    }}
                    onEditRule={(updatedRule) => {
                        const { id, ...updates } = updatedRule;
                        updateCategoryRule(id, updates);
                        setEditingRule(null);
                    }}
                />
            )}
        </div>
    );
};

export default CategoryRules;
