import React, { useState } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { BankAccount } from '../../../types';
import BankAccountForm from '../../forms/BankAccountForm';
import { useData } from '../../../contexts/DataContext';

interface BankAccountStepProps {
  onNext?: () => void;
  onPrevious?: () => void;
}

const BankAccountStep: React.FC<BankAccountStepProps> = () => {
  const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, getAccountBalance } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const handleAddAccount = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      deleteBankAccount(accountId);
    }
  };

  const handleAccountSubmit = async (accountData: Omit<BankAccount, 'id'>) => {
    if (editingAccount) {
      await updateBankAccount(editingAccount.id, accountData);
    } else {
      await addBankAccount(accountData);
    }
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleAccountCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {editingAccount ? 'Update your bank account details' : 'Add your primary bank account to get started'}
          </p>
        </div>

        <BankAccountForm
          account={editingAccount || undefined}
          onSubmit={handleAccountSubmit}
          onCancel={handleAccountCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bank Accounts</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Add your bank accounts to track your finances effectively. You can add more accounts later.
        </p>
      </div>

      {bankAccounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Bank Accounts</h3>
          <div className="grid gap-4">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:border-gray-500 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{account.logo}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{account.bank}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{account.number}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    ₹{getAccountBalance(account.id).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:text-blue-400 transition-colors"
                    title="Edit Account"
                  >
                    <CreditCard className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:text-red-400 transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={handleAddAccount}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Bank Account
        </button>
      </div>
    </div>
  );
};

export default BankAccountStep;