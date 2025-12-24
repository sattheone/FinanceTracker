import React, { useState } from 'react';
import { BankAccount } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BankAccountFormProps {
  account?: BankAccount;
  onSubmit: (accountData: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
}

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
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();

  // Determine if initial bank is custom (not in the predefined list, ignoring 'Other')
  const isInitiallyCustom = account?.bank && !bankLogos.some(b => b.name === account.bank && b.name !== 'Other');
  const [isCustomBank, setIsCustomBank] = useState(isInitiallyCustom || false);

  const [formData, setFormData] = useState({
    bank: account?.bank || '',
    accountNumber: account?.number ? account.number.replace('xx', '') : '',
    balance: account?.balance || 0,
    logo: account?.logo || '🏦',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank.trim()) {
      newErrors.bank = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (formData.accountNumber.length < 4) {
      newErrors.accountNumber = 'Account number must be at least 4 characters';
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
    const maskedNumber = `xx${formData.accountNumber.slice(-4)}`;

    onSubmit({
      bank: formData.bank,
      number: maskedNumber,
      balance: formData.balance,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bank Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
          Select Bank
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {bankLogos.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => handleBankSelect(bank.name, bank.logo)}
              className={`flex items-center space-x-2 p-3 border-2 rounded-lg transition-all ${(!isCustomBank && formData.bank === bank.name) || (isCustomBank && bank.name === 'Other')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <span className="text-xl">{bank.logo}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {bank.name}
              </span>
            </button>
          ))}
        </div>
        {errors.bank && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bank}</p>
        )}
      </div>

      {/* Custom Bank Name (if Other is selected) */}
      {isCustomBank && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Bank Name
          </label>
          <input
            type="text"
            value={formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="theme-input"
            placeholder="Enter bank name"
            autoFocus
          />
        </div>
      )}

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Account Number
        </label>
        <input
          type="text"
          value={formData.accountNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
          className="theme-input"
          placeholder="Enter account number"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Only the last 4 digits will be displayed for security
        </p>
        {errors.accountNumber && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountNumber}</p>
        )}
      </div>

      {/* Current Balance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Current Balance
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.balance}
          onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
          className="theme-input"
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter your current account balance. You can update this anytime.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {account ? 'Update Account' : 'Add Account'}
        </button>
      </div>
    </form>
  );
};

export default BankAccountForm;