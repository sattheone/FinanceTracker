import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  defaultBankAccountId?: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, onSubmit, onCancel, defaultBankAccountId }) => {
  const { bankAccounts } = useData();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    type: 'expense' as Transaction['type'],
    amount: 0,
    paymentMethod: '',
    bankAccountId: defaultBankAccountId || bankAccounts[0]?.id || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod || '',
        bankAccountId: transaction.bankAccountId || bankAccounts[0]?.id || '',
      });
    }
  }, [transaction, bankAccounts]);

  const transactionTypes = [
    { value: 'income', label: 'Income', icon: '💰', color: 'text-green-600' },
    { value: 'expense', label: 'Expense', icon: '💸', color: 'text-red-600' },
    { value: 'investment', label: 'Investment', icon: '📈', color: 'text-blue-600' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️', color: 'text-purple-600' },
  ];

  const categoryOptions = {
    income: ['Salary', 'Bonus', 'Interest', 'Dividend', 'Rental', 'Business', 'Other Income'],
    expense: ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other Expense'],
    investment: ['SIP', 'Stocks', 'Mutual Funds', 'Fixed Deposit', 'Gold', 'Real Estate', 'Other Investment'],
    insurance: ['Life Insurance', 'Health Insurance', 'Vehicle Insurance', 'Home Insurance', 'Other Insurance'],
  };

  const paymentMethods = [
    'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI', 'Net Banking', 'Cheque', 'Other'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      date: formData.date,
      description: formData.description.trim(),
      category: formData.category,
      type: formData.type,
      amount: formData.amount,
      paymentMethod: formData.paymentMethod || undefined,
      bankAccountId: formData.bankAccountId || undefined,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset category when type changes
    if (field === 'type') {
      setFormData(prev => ({ ...prev, category: '' }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedType = transactionTypes.find(t => t.value === formData.type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="form-label">
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className={`input-field ${errors.date ? 'border-red-500' : ''}`}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        <div>
          <label className="form-label">
            Transaction Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="input-field"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Bank Account *
          </label>
          <select
            value={formData.bankAccountId}
            onChange={(e) => handleChange('bankAccountId', e.target.value)}
            className="input-field"
          >
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.logo} {account.bank} ({account.number})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="form-label">
            Description *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className={`input-field ${errors.description ? 'border-red-500' : ''}`}
            placeholder="e.g., Grocery shopping, Salary credit, SIP investment"
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        <div>
          <label className="form-label">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className={`input-field ${errors.category ? 'border-red-500' : ''}`}
          >
            <option value="">Select a category</option>
            {categoryOptions[formData.type].map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="form-label">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => handleChange('amount', Number(e.target.value))}
              className={`input-field pl-8 ${errors.amount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div className="md:col-span-3">
          <label className="form-label">
            Payment Method (Optional)
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="input-field"
          >
            <option value="">Select payment method</option>
            {paymentMethods.map(method => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Preview */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Transaction Preview</h4>
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{selectedType?.icon}</span>
            <div>
              <p className="font-medium text-gray-900">{formData.description || 'Transaction Description'}</p>
              <p className="text-sm text-gray-600">
                {formData.category || 'Category'} • {new Date(formData.date).toLocaleDateString()}
                {formData.paymentMethod && ` • ${formData.paymentMethod}`}
              </p>
              {formData.bankAccountId && (
                <p className="text-xs text-gray-500">
                  {bankAccounts.find(acc => acc.id === formData.bankAccountId)?.bank} ({bankAccounts.find(acc => acc.id === formData.bankAccountId)?.number})
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${selectedType?.color || 'text-gray-900'}`}>
              {formData.type === 'income' ? '+' : '-'}₹{formData.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 uppercase">{formData.type}</p>
          </div>
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="space-y-2">
        <label className="form-label">
          Quick Amount Selection
        </label>
        <div className="flex flex-wrap gap-2">
          {[100, 500, 1000, 5000, 10000, 25000, 50000].map(amount => (
            <button
              key={amount}
              type="button"
              onClick={() => handleChange('amount', amount)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ₹{amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
          {transaction ? 'Update Transaction' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;