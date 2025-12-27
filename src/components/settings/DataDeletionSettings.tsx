import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import FirebaseService from '../../services/firebaseService';

interface DataTypeConfig {
    id: string;
    label: string;
    description: string;
    confirmText: string;
    requireTypedConfirmation: boolean;
    getCount: () => number;
    deleteMethod: (userId: string) => Promise<number>;
}

const DataDeletionSettings: React.FC = () => {
    const { user } = useAuth();
    const {
        transactions,
        bankAccounts,
        assets,
        liabilities,
        goals,
        insurance,
        recurringTransactions,
        bills
    } = useData();

    const [deletingType, setDeletingType] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedType, setSelectedType] = useState<DataTypeConfig | null>(null);
    const [confirmInput, setConfirmInput] = useState('');
    const [deleteStatus, setDeleteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const dataTypes: DataTypeConfig[] = [
        {
            id: 'transactions',
            label: 'Transactions',
            description: 'All your income and expense transactions',
            confirmText: 'This will permanently delete all your transactions. This action cannot be undone.',
            requireTypedConfirmation: true,
            getCount: () => transactions.length,
            deleteMethod: FirebaseService.deleteAllTransactions,
        },
        {
            id: 'bankAccounts',
            label: 'Bank Accounts',
            description: 'All your linked bank accounts',
            confirmText: 'This will permanently delete all your bank accounts. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => bankAccounts.length,
            deleteMethod: FirebaseService.deleteAllBankAccounts,
        },
        {
            id: 'assets',
            label: 'Assets',
            description: 'All your tracked assets and investments',
            confirmText: 'This will permanently delete all your assets. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => assets.length,
            deleteMethod: FirebaseService.deleteAllAssets,
        },
        {
            id: 'liabilities',
            label: 'Liabilities',
            description: 'All your loans and debts',
            confirmText: 'This will permanently delete all your liabilities. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => liabilities.length,
            deleteMethod: FirebaseService.deleteAllLiabilities,
        },
        {
            id: 'goals',
            label: 'Financial Goals',
            description: 'All your savings and financial goals',
            confirmText: 'This will permanently delete all your goals. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => goals.length,
            deleteMethod: FirebaseService.deleteAllGoals,
        },
        {
            id: 'insurance',
            label: 'Insurance Policies',
            description: 'All your insurance policy records',
            confirmText: 'This will permanently delete all your insurance policies. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => insurance.length,
            deleteMethod: FirebaseService.deleteAllInsurance,
        },
        {
            id: 'recurring',
            label: 'Recurring Transactions',
            description: 'All your recurring transaction templates',
            confirmText: 'This will permanently delete all your recurring transactions. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => recurringTransactions.length,
            deleteMethod: FirebaseService.deleteAllRecurringTransactions
        },
        {
            id: 'bills',
            label: 'Bills',
            description: 'All your bill records and reminders',
            confirmText: 'This will permanently delete all your bills. This action cannot be undone.',
            requireTypedConfirmation: false,
            getCount: () => bills.length,
            deleteMethod: FirebaseService.deleteAllBills
        }
    ];

    const handleDeleteClick = (dataType: DataTypeConfig) => {
        if (dataType.getCount() === 0) {
            setDeleteStatus({ type: 'error', message: `No ${dataType.label.toLowerCase()} to delete.` });
            setTimeout(() => setDeleteStatus(null), 3000);
            return;
        }

        setSelectedType(dataType);
        setShowConfirmDialog(true);
        setConfirmInput('');
    };

    const handleConfirmDelete = async () => {
        if (!selectedType || !user?.id) return;

        // Check typed confirmation if required
        if (selectedType.requireTypedConfirmation && confirmInput !== 'DELETE') {
            setDeleteStatus({ type: 'error', message: 'Please type DELETE to confirm.' });
            return;
        }

        setDeletingType(selectedType.id);
        setShowConfirmDialog(false);

        try {
            const deletedCount = await selectedType.deleteMethod(user.id);

            setDeleteStatus({
                type: 'success',
                message: `Successfully deleted ${deletedCount} ${selectedType.label.toLowerCase()}.`
            });

            setTimeout(() => setDeleteStatus(null), 5000);
        } catch (error) {
            console.error(`Error deleting ${selectedType.label}:`, error);
            setDeleteStatus({
                type: 'error',
                message: `Failed to delete ${selectedType.label.toLowerCase()}. Please try again.`
            });
            setTimeout(() => setDeleteStatus(null), 5000);
        } finally {
            setDeletingType(null);
            setSelectedType(null);
            setConfirmInput('');
        }
    };

    const handleCancelDelete = () => {
        setShowConfirmDialog(false);
        setSelectedType(null);
        setConfirmInput('');
    };

    return (
        <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                            Delete Specific Data
                        </h4>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Selectively delete specific types of data without removing your entire account.
                            Deleted data cannot be recovered.
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            {deleteStatus && (
                <div className={`p-4 rounded-lg ${deleteStatus.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                    }`}>
                    {deleteStatus.message}
                </div>
            )}

            {/* Data Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataTypes.map((dataType) => {
                    const count = dataType.getCount();
                    const isDeleting = deletingType === dataType.id;

                    return (
                        <div
                            key={dataType.id}
                            className="border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-4"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {dataType.label}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {dataType.description}
                                    </p>
                                </div>
                                <div className="ml-3 flex-shrink-0">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                                        {count} {count === 1 ? 'item' : 'items'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteClick(dataType)}
                                disabled={count === 0 || isDeleting}
                                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${count === 0
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    : isDeleting
                                        ? 'bg-amber-600 text-white cursor-wait'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete All {dataType.label}
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && selectedType && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-start space-x-3 mb-4">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Delete All {selectedType.label}?
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {selectedType.confirmText}
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    This will delete {selectedType.getCount()} {selectedType.label.toLowerCase()}.
                                </p>
                            </div>
                        </div>

                        {selectedType.requireTypedConfirmation && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type <span className="font-bold">DELETE</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    className="input-field theme-input"
                                    placeholder="DELETE"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button
                                onClick={handleCancelDelete}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={selectedType.requireTypedConfirmation && confirmInput !== 'DELETE'}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium ${selectedType.requireTypedConfirmation && confirmInput !== 'DELETE'
                                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                            >
                                Delete {selectedType.label}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataDeletionSettings;
