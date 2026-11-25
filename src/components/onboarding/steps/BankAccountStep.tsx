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
          <h2 className="text-2xl font-bold theme-text-primary mb-2">
            {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
          </h2>
          <p className="theme-text-secondary">
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
        <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-accent-primary)' }} />
        <h2 className="text-2xl font-bold theme-text-primary mb-2">Bank Accounts</h2>
        <p className="theme-text-secondary">
          Add your bank accounts to track your finances effectively. You can add more accounts later.
        </p>
      </div>

      {bankAccounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold theme-text-primary">Your Bank Accounts</h3>
          <div className="grid gap-4">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="card !p-4 flex items-center justify-between gap-3 hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="text-2xl">{account.logo}</span>
                  <div className="min-w-0">
                    <h4 className="font-medium theme-text-primary break-words">{account.bank}</h4>
                    <p className="text-sm theme-text-muted break-all">{account.number}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-base sm:text-lg font-semibold theme-text-primary whitespace-nowrap">
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
        <button onClick={handleAddAccount} className="btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Bank Account
        </button>
      </div>
    </div>
  );
};

export default BankAccountStep;