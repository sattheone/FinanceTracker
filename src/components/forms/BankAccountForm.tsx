import React, { useState } from 'react';
import { BankAccount } from '../../types';

interface BankAccountFormProps {
  account?: BankAccount;
  onSubmit: (accountData: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({
  account,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    bank: account?.bank || '',
    accountNumber: account?.number ? account.number.replace('xx', '') : '',
    balance: account?.balance || 0,
    logo: account?.logo || '🏦',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (formData.balance < 0) {
      newErrors.balance = 'Balance cannot be negative';
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
    });
  };

  const handleBankSelect = (bankName: string, logo: string) => {
    setFormData(prev => ({
      ...prev,
      bank: bankName,
      logo: logo,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bank Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Bank
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {bankLogos.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => handleBankSelect(bank.name, bank.logo)}
              className={`flex items-center space-x-2 p-3 border-2 rounded-lg transition-all ${
                formData.bank === bank.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{bank.logo}</span>
              <span className="text-sm font-medium text-gray-900 truncate">
                {bank.name}
              </span>
            </button>
          ))}
        </div>
        {errors.bank && (
          <p className="mt-1 text-sm text-red-600">{errors.bank}</p>
        )}
      </div>

      {/* Custom Bank Name (if Other is selected) */}
      {formData.bank === 'Other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name
          </label>
          <input
            type="text"
            value={formData.bank === 'Other' ? '' : formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter bank name"
          />
        </div>
      )}

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Number
        </label>
        <input
          type="text"
          value={formData.accountNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter account number"
        />
        <p className="mt-1 text-xs text-gray-500">
          Only the last 4 digits will be displayed for security
        </p>
        {errors.accountNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
        )}
      </div>

      {/* Current Balance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Balance
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.balance}
          onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-gray-500">
          This is your current account balance. New transactions will automatically update this balance.
        </p>
        {errors.balance && (
          <p className="mt-1 text-sm text-red-600">{errors.balance}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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