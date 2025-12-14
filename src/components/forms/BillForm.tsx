import React, { useState, useEffect } from 'react';
import { Bill } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';

interface BillFormProps {
  bill?: Bill;
  onSubmit: () => void;
  onCancel: () => void;
}

const BillForm: React.FC<BillFormProps> = ({ bill, onSubmit, onCancel }) => {
  const { bankAccounts, addBill, updateBill, categories: contextCategories } = useData();
  const theme = useThemeClasses();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    amount: 0,
    dueDate: '',
    frequency: 'monthly' as Bill['frequency'],
    reminderDays: 3,
    bankAccountId: bankAccounts[0]?.id || '',
    vendor: '',
    tags: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  // Use categories from context
  const categories = contextCategories || [];

  // Removed localstorage loading effect

  useEffect(() => {
    if (bill) {
      setFormData({
        name: bill.name,
        description: bill.description,
        category: bill.category,
        amount: bill.amount,
        dueDate: bill.dueDate,
        frequency: bill.frequency,
        reminderDays: bill.reminderDays,
        bankAccountId: bill.bankAccountId || bankAccounts[0]?.id || '',
        vendor: bill.vendor || '',
        tags: bill.tags
      });
    }
  }, [bill, bankAccounts]);



  const frequencies = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'one-time', label: 'One-time' }
  ];

  const utilityProviders = [
    'Electricity Board', 'Gas Company', 'Water Department', 'Internet Provider',
    'Mobile Network', 'DTH/Cable', 'Maintenance', 'Other'
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Bill name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const billData = {
      ...formData,
      isPaid: false,
      isOverdue: new Date(formData.dueDate) < new Date(),
      createdAt: bill?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (bill) {
        await updateBill(bill.id, billData);
      } else {
        await addBill(billData);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={theme.label}>
            Bill Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={cn(theme.input, errors.name && 'border-red-500 dark:border-red-400')}
            placeholder="e.g., Electricity Bill, Internet Bill"
          />
          {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className={theme.label}>
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className={cn(theme.select, errors.category && 'border-red-500 dark:border-red-400')}
          >
            <option value="">Select a category</option>
            {categories
              .filter(c => c.id !== 'salary')
              .map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
          </select>
          {errors.category && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.category}</p>}
        </div>
      </div>

      <div>
        <label className={theme.label}>
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className={cn(theme.textarea, errors.description && 'border-red-500 dark:border-red-400')}
          rows={3}
          placeholder="Detailed description of the bill"
        />
        {errors.description && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Amount and Due Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={theme.label}>
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => handleChange('amount', Number(e.target.value))}
              className={cn(theme.input, 'pl-8', errors.amount && 'border-red-500 dark:border-red-400')}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.amount && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div>
          <label className={theme.label}>
            Due Date *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
            className={cn(theme.input, errors.dueDate && 'border-red-500 dark:border-red-400')}
          />
          {errors.dueDate && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.dueDate}</p>}
        </div>

        <div>
          <label className={theme.label}>
            Frequency
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => handleChange('frequency', e.target.value)}
            className={theme.select}
          >
            {frequencies.map(freq => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bank Account and Vendor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={theme.label}>
            Bank Account
          </label>
          <select
            value={formData.bankAccountId}
            onChange={(e) => handleChange('bankAccountId', e.target.value)}
            className={theme.select}
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
          <label className={theme.label}>
            Vendor/Provider
          </label>
          {formData.category === 'Utilities' || formData.category === 'Internet & Phone' ? (
            <select
              value={formData.vendor}
              onChange={(e) => handleChange('vendor', e.target.value)}
              className={theme.select}
            >
              <option value="">Select provider</option>
              {utilityProviders.map(provider => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => handleChange('vendor', e.target.value)}
              className={theme.input}
              placeholder="e.g., HDFC Bank, Airtel, Netflix"
            />
          )}
        </div>
      </div>

      {/* Reminder Settings */}
      <div>
        <label className={theme.label}>
          Reminder Days Before Due Date
        </label>
        <input
          type="number"
          value={formData.reminderDays}
          onChange={(e) => handleChange('reminderDays', Number(e.target.value))}
          className={theme.input}
          min="0"
          max="30"
        />
        <p className={cn(theme.textMuted, 'text-sm mt-1')}>
          You'll be reminded {formData.reminderDays} days before the due date
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className={theme.label}>
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
            className={theme.input}
            placeholder="Add a tag and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            className={theme.btnSecondary}
          >
            Add
          </button>
        </div>
      </div>

      {/* Bill Preview */}
      <div className={cn(theme.card, 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700')}>
        <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Bill Preview</h4>
        <div className="flex items-center justify-between">
          <div>
            <p className={cn(theme.textPrimary, 'font-medium')}>{formData.name || 'Bill Name'}</p>
            <p className={cn(theme.textSecondary, 'text-sm')}>
              {formData.category} • Due: {formData.dueDate || 'Select date'}
            </p>
            {formData.vendor && (
              <p className={cn(theme.textMuted, 'text-xs')}>Provider: {formData.vendor}</p>
            )}
          </div>
          <div className="text-right">
            <p className={cn(theme.textPrimary, 'text-lg font-bold')}>
              ₹{formData.amount.toLocaleString()}
            </p>
            <p className={cn(theme.textMuted, 'text-xs')}>
              {formData.frequency}
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={onCancel}
          className={theme.btnSecondary}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={theme.btnPrimary}
        >
          {bill ? 'Update' : 'Create'} Bill
        </button>
      </div>
    </form>
  );
};

export default BillForm;