import React, { useState } from 'react';
import { BankAccount, AccountType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Wallet, CreditCard } from 'lucide-react';

interface BankAccountFormProps {
  account?: BankAccount;
  currentBalance?: number;
  onSubmit: (accountData: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
}

const accountTypes: { type: AccountType; name: string; icon: any; description: string }[] = [
  { type: 'bank', name: 'Bank Account', icon: Building2, description: 'Savings or checking account' },
  { type: 'cash', name: 'Cash', icon: Wallet, description: 'Physical cash or wallet' },
  { type: 'credit_card', name: 'Credit Card', icon: CreditCard, description: 'Credit card account' },
];

const bankLogos = [
  { name: 'HDFC Bank', logo: '🏦' },
  { name: 'State Bank of India', logo: '🏛️' },
  { name: 'ICICI Bank', logo: '🏢' },
  { name: 'Axis Bank', logo: '🏪' },
  { name: 'Kotak Mahindra Bank', logo: '🏬' },
  { name: 'Punjab National Bank', logo: '🏭' },
  { name: 'Bank of Baroda', logo: '🏯' },
  { name: 'Canara Bank', logo: '🏰' },
  { name: 'Union Bank', logo: '🏛️' },
  { name: 'Other', logo: '💳' },
];

const BankAccountForm: React.FC<BankAccountFormProps> = ({
  account,
  currentBalance,
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();

  // Account type state
  const [accountType, setAccountType] = useState<AccountType>(account?.accountType || 'bank');

  // Determine if initial bank is custom (not in the predefined list, ignoring 'Other')
  const isInitiallyCustom = account?.bank && !bankLogos.some(b => b.name === account.bank && b.name !== 'Other');
  const [isCustomBank, setIsCustomBank] = useState(isInitiallyCustom || false);

  const [formData, setFormData] = useState({
    bank: account?.bank || '',
    accountNumber: account?.number ? account.number.replace('xx', '') : '',
    initialBalance: account?.initialBalance || 0,
    currentBalance: currentBalance ?? (account?.initialBalance || 0),
    logo: account?.logo || '🏦',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank.trim()) {
      newErrors.bank = accountType === 'bank' ? 'Bank name is required' :
        accountType === 'credit_card' ? 'Card name is required' :
          'Account name is required';
    }

    // Account number not required for cash
    if (accountType !== 'cash') {
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = accountType === 'credit_card' ? 'Card number is required' : 'Account number is required';
      } else if (formData.accountNumber.length < 4) {
        newErrors.accountNumber = 'Must be at least 4 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Mask account number for display (show last 4 digits)
    const maskedNumber = accountType === 'cash' ? '' : `xx${formData.accountNumber.slice(-4)}`;

    onSubmit({
      accountType,
      bank: formData.bank,
      number: maskedNumber,
      initialBalance: formData.initialBalance,
      logo: formData.logo,
      userId: user?.id || '',
    });
  };

  const handleBankSelect = (bankName: string, logo: string) => {
    const isCustom = bankName === 'Other';
    setIsCustomBank(isCustom);

    setFormData(prev => ({
      ...prev,
      bank: isCustom ? '' : bankName, // Clear bank name if custom so user can type
      logo: logo,
    }));
  };

  const handleAccountTypeChange = (type: AccountType) => {
    setAccountType(type);
    setIsCustomBank(false);

    // Set default values based on account type
    if (type === 'cash') {
      setFormData(prev => ({
        ...prev,
        bank: 'Cash Wallet',
        logo: '💵',
        accountNumber: '',
      }));
    } else if (type === 'credit_card') {
      setFormData(prev => ({
        ...prev,
        bank: '',
        logo: '💳',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        bank: '',
        logo: '🏦',
      }));
    }
  };

  // Handle current balance change
  const handleCurrentBalanceChange = (newBalance: number) => {
    // Calculate the difference between the old current balance and the new one
    // But importantly, we need to know the 'transactions sum' essentially.
    // transactionsSum = originalCurrentBalance - originalInitialBalance
    // newInitialBalance = newCurrentBalance - transactionsSum

    const originalCurrentBalance = currentBalance ?? (account?.initialBalance || 0);
    const originalInitialBalance = account?.initialBalance || 0;
    const transactionsSum = originalCurrentBalance - originalInitialBalance;

    const newInitialBalance = newBalance - transactionsSum;

    setFormData(prev => ({
      ...prev,
      currentBalance: newBalance,
      initialBalance: newInitialBalance
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account Type Selection */}
      <div>
        <label className="form-label">
          Account Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          {accountTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.type}
                type="button"
                onClick={() => handleAccountTypeChange(type.type)}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${accountType === type.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${accountType === type.type ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{type.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{type.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bank Selection - Only for Bank accounts */}
      {accountType === 'bank' && (
        <div>
          <label className="form-label">
            Select Bank
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bankLogos.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => handleBankSelect(option.name, option.logo)}
                className={`flex items-center space-x-2 p-3 border-2 rounded-lg transition-all ${(!isCustomBank && formData.bank === option.name) || (isCustomBank && option.name === 'Other')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <span className="text-xl">{option.logo}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {option.name}
                </span>
              </button>
            ))}
          </div>
          {errors.bank && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bank}</p>
          )}
        </div>
      )}

      {/* Custom Bank Name (if Other is selected) */}
      {accountType === 'bank' && isCustomBank && (
        <div>
          <label className="form-label">
            Bank Name
          </label>
          <input
            type="text"
            value={formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="input-field theme-input"
            placeholder="Enter bank name"
            autoFocus
          />
        </div>
      )}

      {/* Credit Card Name */}
      {accountType === 'credit_card' && (
        <div>
          <label className="form-label">
            Card Name
          </label>
          <input
            type="text"
            value={formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="input-field theme-input"
            placeholder="e.g., HDFC Regalia, SBI SimplyCLICK"
          />
          {errors.bank && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bank}</p>
          )}
        </div>
      )}

      {/* Cash Account Name */}
      {accountType === 'cash' && (
        <div>
          <label className="form-label">
            Wallet Name
          </label>
          <input
            type="text"
            value={formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="input-field theme-input"
            placeholder="e.g., Cash Wallet, Petty Cash"
          />
          {errors.bank && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bank}</p>
          )}
        </div>
      )}

      {/* Account/Card Number - Not shown for Cash */}
      {accountType !== 'cash' && (
        <div>
          <label className="form-label">
            {accountType === 'credit_card' ? 'Card Number (Last 4 digits)' : 'Account Number'}
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
            className="input-field theme-input"
            placeholder={accountType === 'credit_card' ? 'Enter last 4 digits' : 'Enter account number'}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only the last 4 digits will be displayed for security
          </p>
          {errors.accountNumber && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountNumber}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Balance - Only shown when editing and currentBalance prop is provided */}
        {account && currentBalance !== undefined && (
          <div>
            <label className="form-label">
              Current Balance
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.currentBalance}
              onChange={(e) => handleCurrentBalanceChange(parseFloat(e.target.value) || 0)}
              className="input-field theme-input font-semibold text-blue-600 dark:text-blue-400"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Updating this will automatically adjust the initial balance.
            </p>
          </div>
        )}

        {/* Initial Balance */}
        <div>
          <label className="form-label">
            {accountType === 'credit_card' ? 'Initial Outstanding Balance' : 'Initial Balance'}
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.initialBalance === 0 ? '' : formData.initialBalance}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              // If we are editing, we should probably check if we need to update current balance as well?
              // The user might be correcting the initial balance.
              // If initial balance changes by +X, current balance should also change by +X
              if (account && currentBalance !== undefined) {
                const diff = val - formData.initialBalance;
                setFormData(prev => ({ ...prev, initialBalance: val, currentBalance: prev.currentBalance + diff }));
              } else {
                setFormData(prev => ({ ...prev, initialBalance: val }));
              }
            }}
            className="input-field theme-input"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {accountType === 'credit_card'
              ? 'Starting outstanding balance'
              : 'Starting account balance'}
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          {account ? 'Update Account' : 'Add Account'}
        </button>
      </div>
    </form>
  );
};

export default BankAccountForm;