import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import AutoCategorizationService from '../../services/autoCategorization';

interface SimpleTransactionFormProps {
  transaction?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

const SimpleTransactionForm: React.FC<SimpleTransactionFormProps> = ({
  transaction,
  onSubmit,
  onCancel
}) => {
  const { bankAccounts, categories: contextCategories } = useData();
  const theme = useThemeClasses();
  // Use categories from context
  const categories = contextCategories || [];

  const [formData, setFormData] = useState({
    date: '',
    description: '',
    category: '',
    type: 'expense' as Transaction['type'],
    amount: 0,
    paymentMethod: '',
    bankAccountId: '',
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
        bankAccountId: transaction.bankAccountId || '',
      });
    } else {
      // Set default date to today
      setFormData(prev => ({
        ...prev,
        date: new Date().toISOString().split('T')[0]
      }));
    }
  }, [transaction]);

  const transactionTypes = [
    { value: 'income', label: 'Income', icon: '💰' },
    { value: 'expense', label: 'Expense', icon: '💸' },
    { value: 'investment', label: 'Investment', icon: '📈' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  ];

  // Removed localstorage loading effect



  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.bankAccountId) newErrors.bankAccountId = 'Bank Account is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const transactionData: Omit<Transaction, 'id'> = {
      date: formData.date,
      description: formData.description.trim(),
      category: formData.category,
      type: formData.type,
      amount: formData.amount,
      paymentMethod: formData.paymentMethod || undefined,
      bankAccountId: formData.bankAccountId || undefined,
    };

    onSubmit(transactionData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-suggest category when description changes
    if (field === 'description' && value.length > 3) {
      const result = AutoCategorizationService.suggestCategoryForTransaction(
        value,
        formData.amount,
        formData.type
      );

      // Only auto-assign if no category is selected yet
      if (!formData.category || formData.category === '') {
        setFormData(prev => ({ ...prev, category: result.categoryId }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => {
              handleChange('type', e.target.value);
              handleChange('category', ''); // Reset category when type changes
            }}
            className="input-field theme-input"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Description *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className={`input-field ${errors.description ? 'border-red-500' : ''}`}
            placeholder="e.g., Grocery shopping, Salary payment"
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className={`input-field ${errors.category ? 'border-red-500' : ''}`}
          >
            <option value="">Select Category</option>
            {categories
              .filter(c => formData.type !== 'expense' || c.id !== 'salary')
              .map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
          </select>
          {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Payment Method
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="input-field theme-input"
          >
            <option value="">Select Payment Method</option>
            <option value="cash">Cash</option>
            <option value="debit_card">Debit Card</option>
            <option value="credit_card">Credit Card</option>
            <option value="upi">UPI</option>
            <option value="net_banking">Net Banking</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Bank Account *
          </label>
          <select
            value={formData.bankAccountId}
            onChange={(e) => handleChange('bankAccountId', e.target.value)}
            className="input-field theme-input"
          >
            <option value="">Select Bank Account</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.bank} (...{account.number.slice(-4)})
              </option>
            ))}
          </select>
          {errors.bankAccountId && <p className="text-red-500 text-sm mt-1">{errors.bankAccountId}</p>}
        </div>
      </div>

      {/* Simple Goal Suggestion */}
      <div className={cn(theme.card, 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700')}>
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">💡</span>
          </div>
          <div>
            <h4 className={cn(theme.textPrimary, 'font-medium mb-2')}>
              Goal Tracking Tip
            </h4>
            <p className={cn(theme.textSecondary, 'text-sm')}>
              After adding this transaction, you can track it toward your financial goals
              in the Goals section using our simplified goal tracker.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

export default SimpleTransactionForm;