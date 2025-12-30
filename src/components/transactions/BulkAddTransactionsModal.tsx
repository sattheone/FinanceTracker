import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Transaction } from '../../types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InlineCategoryEditor from './InlineCategoryEditor';

interface BulkTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  category: string;
  bankAccountId: string;
}

interface BulkAddTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount?: string;
}

const BulkAddTransactionsModal: React.FC<BulkAddTransactionsModalProps> = ({
  isOpen,
  onClose,
  selectedAccount
}) => {
  const { categories, bankAccounts, addTransactionsBulk } = useData();
  
  const [transactions, setTransactions] = useState<BulkTransaction[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize with 5 empty rows
  useEffect(() => {
    if (isOpen && transactions.length === 0) {
      const defaultBankAccount = selectedAccount || bankAccounts.find(acc => acc.id)?.id || bankAccounts[0]?.id || '';
      const defaultCategory = categories.find(cat => cat.name === 'Other') || categories[0];
      
      setTransactions(Array.from({ length: 5 }, (_, index) => ({
        id: `new-${index}`,
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: 'expense' as const,
        category: defaultCategory?.id || '',
        bankAccountId: defaultBankAccount
      })));
    }
  }, [isOpen, bankAccounts, categories, transactions.length, selectedAccount]);

  const addRow = () => {
    const defaultBankAccount = selectedAccount || bankAccounts.find(acc => acc.id)?.id || bankAccounts[0]?.id || '';
    const defaultCategory = categories.find(cat => cat.name === 'Other') || categories[0];
    
    setTransactions([...transactions, {
      id: `new-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      type: 'expense',
      category: defaultCategory?.id || '',
      bankAccountId: defaultBankAccount
    }]);
  };

  const removeRow = (id: string) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const updateTransaction = (id: string, field: keyof BulkTransaction, value: any) => {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const handleSave = async () => {
    const validTransactions = transactions.filter(t => 
      t.description.trim() && t.amount > 0 && t.bankAccountId
    );

    if (validTransactions.length === 0) {
      alert('Please add at least one valid transaction with description, amount, and bank account.');
      return;
    }

    setSaving(true);
    try {
      // Convert to Transaction format
      const transactionsToAdd: Omit<Transaction, 'id'>[] = validTransactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        bankAccountId: t.bankAccountId,
        tags: [],
        notes: ''
      }));

      await addTransactionsBulk(transactionsToAdd);
      onClose();
      setTransactions([]);
    } catch (error) {
      console.error('Failed to save transactions:', error);
      alert('Failed to save transactions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTransactions([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Add Transactions"
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Add multiple transactions at once. Fill in the details below and click Save to add them all.
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Account</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3">
                    <input
                      type="date"
                      value={transaction.date}
                      onChange={(e) => updateTransaction(transaction.id, 'date', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={transaction.description}
                      onChange={(e) => updateTransaction(transaction.id, 'description', e.target.value)}
                      placeholder="Transaction description"
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={transaction.amount || ''}
                      onChange={(e) => updateTransaction(transaction.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={transaction.type}
                      onChange={(e) => updateTransaction(transaction.id, 'type', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="investment">Investment</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <InlineCategoryEditor
                      currentCategory={transaction.category}
                      onSave={(categoryId) => updateTransaction(transaction.id, 'category', categoryId)}
                      renderTrigger={(onClick) => {
                        const selectedCategory = categories.find(c => c.id === transaction.category);
                        return (
                          <button
                            type="button"
                            onClick={onClick}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-left flex items-center gap-1"
                          >
                            <span>{selectedCategory?.icon || '🏷️'}</span>
                            <span className="truncate">{selectedCategory?.name || 'Select Category'}</span>
                          </button>
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={transaction.bankAccountId}
                      onChange={(e) => updateTransaction(transaction.id, 'bankAccountId', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    >
                      {bankAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.bank} (...{account.number.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => removeRow(transaction.id)}
                      disabled={transactions.length === 1}
                      className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {transactions.length > 10 && (
          <div className="text-center">
            <Button
              variant="secondary"
              onClick={addRow}
              leftIcon={<Plus className="h-4 w-4" />}
              size="sm"
            >
              Add Another Row
            </Button>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={addRow}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Row
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || transactions.every(t => !t.description.trim() || t.amount <= 0)}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {saving ? 'Saving...' : `Save ${transactions.filter(t => t.description.trim() && t.amount > 0).length} Transactions`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkAddTransactionsModal;