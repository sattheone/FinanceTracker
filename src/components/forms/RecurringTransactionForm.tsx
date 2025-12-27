import React, { useState, useEffect } from 'react';
import { RecurringTransaction } from '../../types';
import { useData } from '../../contexts/DataContext';


interface RecurringTransactionFormProps {
  recurringTransaction?: RecurringTransaction;
  onSubmit: () => void;
  onCancel: () => void;
}

const RecurringTransactionForm: React.FC<RecurringTransactionFormProps> = ({
  recurringTransaction,
  onSubmit,
  onCancel
}) => {
  const { bankAccounts, addRecurringTransaction, updateRecurringTransaction, categories: contextCategories } = useData();

  // Use categories from context
  const categories = contextCategories || [];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    type: 'expense' as RecurringTransaction['type'],
    amount: 0,
    frequency: 'monthly' as RecurringTransaction['frequency'],
    interval: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    nextDueDate: new Date().toISOString().split('T')[0],
    isActive: true,
    bankAccountId: bankAccounts[0]?.id || '',
    paymentMethod: '',
    reminderDays: 3,
    autoCreate: true,
    tags: [] as string[],
    vendor: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  // Restore useEffect and constants
  useEffect(() => {
    if (recurringTransaction) {
      setFormData({
        name: recurringTransaction.name,
        description: recurringTransaction.description,
        category: recurringTransaction.category,
        type: recurringTransaction.type,
        amount: recurringTransaction.amount,
        frequency: recurringTransaction.frequency,
        interval: recurringTransaction.interval || 1,
        startDate: recurringTransaction.startDate,
        endDate: recurringTransaction.endDate || '',
        nextDueDate: recurringTransaction.nextDueDate,
        isActive: recurringTransaction.isActive,
        bankAccountId: recurringTransaction.bankAccountId || bankAccounts[0]?.id || '',
        paymentMethod: recurringTransaction.paymentMethod || '',
        reminderDays: recurringTransaction.reminderDays,
        autoCreate: recurringTransaction.autoCreate,
        tags: recurringTransaction.tags,
        vendor: recurringTransaction.vendor || ''
      });
    }
  }, [recurringTransaction, bankAccounts]);

  const transactionTypes = [
    { value: 'income', label: 'Income', icon: '💰', color: 'text-green-600' },
    { value: 'expense', label: 'Expense', icon: '💸', color: 'text-red-600' },
    { value: 'investment', label: 'Investment', icon: '📈', color: 'text-blue-600' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️', color: 'text-purple-600' },
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'weekly', label: 'Weekly', description: 'Every week' },
    { value: 'monthly', label: 'Monthly', description: 'Every month' },
    { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
    { value: 'yearly', label: 'Yearly', description: 'Every year' }
  ];


  const getCategoriesForType = () => {
    // Filter categories based on transaction type
    if (formData.type === 'expense') {
      return categories.filter(c => c.id !== 'salary');
    }
    return categories;
  };

  const subscriptionVendors = [
    'Netflix', 'Amazon Prime', 'Spotify', 'YouTube Premium', 'Disney+', 'Apple Music',
    'Microsoft Office', 'Adobe Creative', 'Zoom', 'Dropbox', 'Google One', 'iCloud',
    'Gym Membership', 'Magazine Subscription', 'Other'
  ];

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const calculateNextDueDate = (startDate: string, frequency: RecurringTransaction['frequency']): string => {
    const date = new Date(startDate);

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + (1 * (formData.interval || 1)));
        break;
      case 'weekly':
        date.setDate(date.getDate() + (7 * (formData.interval || 1)));
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + (1 * (formData.interval || 1)));
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + (3 * (formData.interval || 1)));
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + (1 * (formData.interval || 1)));
        break;
    }

    return date.toISOString().split('T')[0];
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const nextDueDate = calculateNextDueDate(formData.startDate, formData.frequency);

    const recurringTransactionData = {
      ...formData,
      nextDueDate,
      createdAt: recurringTransaction?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (recurringTransaction) {
        await updateRecurringTransaction(recurringTransaction.id, recurringTransactionData);
      } else {
        await addRecurringTransaction(recurringTransactionData);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Transaction Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field theme-input ${errors.name ? 'border-red-500' : ''}`}
            placeholder="e.g., Netflix Subscription, Salary, Rent"
          />
          {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="form-label">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="input-field theme-input"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className={`input-field theme-input ${errors.description ? 'border-red-500' : ''}`}
          rows={3}
          placeholder="Detailed description of the recurring transaction"
        />
        {errors.description && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Category and Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className={`input-field theme-input ${errors.category ? 'border-red-500' : ''}`}
          >
            <option value="">Select a category</option>
            {getCategoriesForType().map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.category}</p>}
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
              className={`input-field theme-input pl-8 ${errors.amount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.amount && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.amount}</p>}
        </div>
      </div>

      {/* Frequency and Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">
            Frequency *
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => handleChange('frequency', e.target.value)}
            className="input-field theme-input"
          >
            {frequencies.map(freq => (
              <option key={freq.value} value={freq.value}>
                {freq.label} - {freq.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Interval
          </label>
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">Every</span>
            <input
              type="number"
              value={formData.interval}
              onChange={(e) => handleChange('interval', Math.max(1, Number(e.target.value)))}
              className="input-field theme-input w-20 text-center"
              min="1"
            />
            <span className="ml-2 text-gray-500">
              {formData.frequency === 'daily' ? 'day(s)' :
                formData.frequency === 'weekly' ? 'week(s)' :
                  formData.frequency === 'monthly' ? 'month(s)' :
                    formData.frequency === 'quarterly' ? 'quarter(s)' : 'year(s)'}
            </span>
          </div>
        </div>

        <div>

          <div>
            <label className="form-label">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={`input-field theme-input ${errors.startDate ? 'border-red-500' : ''}`}
            />
            {errors.startDate && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="form-label">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className={`input-field theme-input ${errors.endDate ? 'border-red-500' : ''}`}
              min={formData.startDate}
            />
            {errors.endDate && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.endDate}</p>}
          </div>
        </div>
      </div>

      {/* Bank Account and Payment Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Bank Account
          </label>
          <select
            value={formData.bankAccountId}
            onChange={(e) => handleChange('bankAccountId', e.target.value)}
            className="input-field theme-input"
          >
            <option value="">Select bank account</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.bank} - {account.number}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Payment Method
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="input-field theme-input"
          >
            <option value="">Select payment method</option>
            <option value="auto_debit">Auto Debit</option>
            <option value="upi">UPI</option>
            <option value="net_banking">Net Banking</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Vendor (for subscriptions) */}
      {formData.category === 'Subscriptions' && (
        <div>
          <label className="form-label">
            Vendor/Service Provider
          </label>
          <select
            value={formData.vendor}
            onChange={(e) => handleChange('vendor', e.target.value)}
            className="input-field theme-input"
          >
            <option value="">Select vendor</option>
            {subscriptionVendors.map(vendor => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="form-label">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="input-field theme-input"
            placeholder="Add a tag and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            className="btn-secondary"
          >
            Add
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Reminder Days Before Due
          </label>
          <input
            type="number"
            value={formData.reminderDays}
            onChange={(e) => handleChange('reminderDays', Number(e.target.value))}
            className="input-field theme-input"
            min="0"
            max="30"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoCreate"
              checked={formData.autoCreate}
              onChange={(e) => handleChange('autoCreate', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="autoCreate" className="form-label ml-2 mb-0">
              Auto-create transactions
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="isActive" className="form-label ml-2 mb-0">
              Active
            </label>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
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
          {recurringTransaction ? 'Update' : 'Create'} Recurring Transaction
        </button>
      </div>
    </form>
  );
};

export default RecurringTransactionForm;