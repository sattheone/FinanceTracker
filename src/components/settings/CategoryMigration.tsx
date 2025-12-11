import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { previewMigration, migrateInvalidCategories, MigrationResult } from '../../utils/categoryMigration';
import { formatCurrency } from '../../utils/formatters';

const CategoryMigration: React.FC = () => {
    const { transactions, updateTransaction } = useData();
    const [preview, setPreview] = useState<{
        affectedCount: number;
        invalidCategoryIds: string[];
        sampleTransactions: Array<{
            id: string;
            description: string;
            amount: number;
            currentCategory: string;
            date: string;
        }>;
    } | null>(null);
    const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        // Check for invalid categories on mount
        const previewData = previewMigration(transactions);
        setPreview(previewData);
    }, [transactions]);

    const handleRunMigration = async () => {
        setIsRunning(true);
        setShowConfirmation(false);

        try {
            const result = await migrateInvalidCategories(transactions, async (id, updates) => {
                await updateTransaction(id, updates);
            });
            setMigrationResult(result);

            // Refresh preview
            const newPreview = previewMigration(transactions);
            setPreview(newPreview);
        } catch (error) {
            console.error('Migration failed:', error);
        } finally {
            setIsRunning(false);
        }
    };

    if (!preview) {
        return <div>Loading...</div>;
    }

    // If no issues found
    if (preview.affectedCount === 0 && !migrationResult) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-medium text-green-800 dark:text-green-200">
                        All Categories Valid
                    </h3>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    All transactions have valid category assignments. No migration needed.
                </p>
            </div>
        );
    }

    // Show migration result
    if (migrationResult) {
        return (
            <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${migrationResult.errors.length > 0
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className={`w-5 h-5 ${migrationResult.errors.length > 0 ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                        <h3 className={`font-medium ${migrationResult.errors.length > 0 ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-200'
                            }`}>
                            Migration Complete
                        </h3>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Total Transactions:</span>
                            <span className="font-medium">{migrationResult.totalTransactions}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Invalid Categories Found:</span>
                            <span className="font-medium text-orange-600">{migrationResult.invalidTransactions}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Successfully Fixed:</span>
                            <span className="font-medium text-green-600">{migrationResult.fixedTransactions}</span>
                        </div>
                        {migrationResult.errors.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-700">
                                <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                                    Errors ({migrationResult.errors.length}):
                                </p>
                                <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-300">
                                    {migrationResult.errors.slice(0, 3).map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                    ))}
                                    {migrationResult.errors.length > 3 && (
                                        <li>... and {migrationResult.errors.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setMigrationResult(null);
                            const newPreview = previewMigration(transactions);
                            setPreview(newPreview);
                        }}
                        className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Check Again
                    </button>
                </div>
            </div>
        );
    }

    // Show preview and confirmation
    return (
        <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="font-medium text-orange-800 dark:text-orange-200">
                        Invalid Categories Detected
                    </h3>
                </div>

                <div className="space-y-3 text-sm text-orange-700 dark:text-orange-300">
                    <p>
                        Found <strong>{preview.affectedCount}</strong> transaction(s) with invalid category IDs.
                    </p>

                    <div>
                        <p className="font-medium mb-1">Invalid Category IDs:</p>
                        <div className="bg-white dark:bg-gray-800 rounded p-2 text-xs font-mono">
                            {preview.invalidCategoryIds.slice(0, 5).join(', ')}
                            {preview.invalidCategoryIds.length > 5 && ` ... and ${preview.invalidCategoryIds.length - 5} more`}
                        </div>
                    </div>

                    {preview.sampleTransactions.length > 0 && (
                        <div>
                            <p className="font-medium mb-2">Sample Affected Transactions:</p>
                            <div className="space-y-2">
                                {preview.sampleTransactions.map(tx => (
                                    <div key={tx.id} className="bg-white dark:bg-gray-800 rounded p-2 text-xs">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium">{tx.description}</span>
                                            <span>{formatCurrency(tx.amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                            <span>Category: {tx.currentCategory}</span>
                                            <span>{new Date(tx.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!showConfirmation ? (
                <button
                    onClick={() => setShowConfirmation(true)}
                    className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Fix Invalid Categories</span>
                </button>
            ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                        This will update <strong>{preview.affectedCount}</strong> transaction(s) to use the "Uncategorized" category.
                        This action cannot be undone automatically, but you can manually recategorize transactions later.
                    </p>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleRunMigration}
                            disabled={isRunning}
                            className="flex-1 flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            {isRunning ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Fixing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Confirm & Fix</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowConfirmation(false)}
                            disabled={isRunning}
                            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryMigration;
