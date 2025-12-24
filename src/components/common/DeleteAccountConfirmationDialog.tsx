import React, { useState } from 'react';
import { AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { BankAccount } from '../../types';

interface DeleteAccountConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (action: 'delete' | 'move', targetAccountId?: string) => void;
    accountName: string;
    transactionCount: number;
    availableAccounts: BankAccount[];
}

const DeleteAccountConfirmationDialog: React.FC<DeleteAccountConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    accountName,
    transactionCount,
    availableAccounts
}) => {
    const [action, setAction] = useState<'delete' | 'move'>('move');
    const [targetAccountId, setTargetAccountId] = useState<string>('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (action === 'move' && !targetAccountId) return;
        onConfirm(action, targetAccountId);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center space-x-3 text-red-600 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Account</h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{accountName}</span>?
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                        Warning: {transactionCount} associated transactions found
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Deleting this account will affect these transactions. How would you like to handle them?
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {/* Option 1: Move Transactions */}
                    <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${action === 'move'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}>
                        <input
                            type="radio"
                            name="deleteAction"
                            value="move"
                            checked={action === 'move'}
                            onChange={() => setAction('move')}
                            className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                            disabled={availableAccounts.length === 0}
                        />
                        <div className="ml-3 flex-1">
                            <span className="block text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                                Move to another account
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Transfer all {transactionCount} transactions to a different bank account.
                            </span>

                            {action === 'move' && (
                                <div className="mt-3">
                                    <select
                                        value={targetAccountId}
                                        onChange={(e) => setTargetAccountId(e.target.value)}
                                        className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Select target account...</option>
                                        {availableAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.bank} - {acc.number.slice(-4).padStart(acc.number.length, '•').slice(-4)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </label>



                    {/* Option 3: Delete Transactions */}
                    <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${action === 'delete'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}>
                        <input
                            type="radio"
                            name="deleteAction"
                            value="delete"
                            checked={action === 'delete'}
                            onChange={() => setAction('delete')}
                            className="mt-1 h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                        />
                        <div className="ml-3">
                            <span className="block text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                                Delete transactions
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Permanently delete all {transactionCount} transactions. This cannot be undone.
                            </span>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={action === 'move' && !targetAccountId}
                        className={`px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm flex items-center ${action === 'delete'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {action === 'delete' ? (
                            <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Account & Data
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Move & Delete Account
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountConfirmationDialog;
