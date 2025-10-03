import React, { useState, useEffect } from 'react';
import { Transaction, TransactionEntityLink } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { transactionLinkingService } from '../../services/transactionLinkingService';
import { Link2, Brain, Target, Shield, TrendingUp, Plus, X } from 'lucide-react';

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  defaultBankAccountId?: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, onSubmit, onCancel, defaultBankAccountId }) => {
  const { bankAccounts, goals, insurance, assets, monthlyBudget } = useData();
  const theme = useThemeClasses();
  
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
  const [entityLinks, setEntityLinks] = useState<TransactionEntityLink[]>([]);
  const [showLinkingSection, setShowLinkingSection] = useState(false);
  const [suggestedLinks, setSuggestedLinks] = useState<TransactionEntityLink[]>([]);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);

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
      setEntityLinks(transaction.entityLinks || []);
    }
  }, [transaction, bankAccounts]);

  // Auto-generate suggested links when form data changes
  useEffect(() => {
    if (formData.description && formData.amount > 0) {
      generateSuggestedLinks();
    }
  }, [formData.description, formData.amount, formData.type]);

  const generateSuggestedLinks = async () => {
    if (isGeneratingLinks) return;
    
    setIsGeneratingLinks(true);
    try {
      const mockTransaction: Transaction = {
        id: 'temp',
        ...formData
      };
      
      const suggestions = await transactionLinkingService.autoLinkTransaction(
        mockTransaction,
        { goals, insurance, assets, budget: monthlyBudget }
      );
      
      setSuggestedLinks(suggestions);
    } catch (error) {
      console.error('Error generating suggested links:', error);
    } finally {
      setIsGeneratingLinks(false);
    }
  };

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
      entityLinks: entityLinks.length > 0 ? entityLinks : undefined,
      isLinked: entityLinks.length > 0,
      autoLinked: entityLinks.some(link => link.linkType === 'auto' || link.linkType === 'rule-based')
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
            className={cn(theme.input, errors.date && 'border-red-500 dark:border-red-400')}
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
            className={theme.select}
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
            className={theme.select}
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
            className={cn(theme.input, errors.description && 'border-red-500 dark:border-red-400')}
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
            className={cn(theme.select, errors.category && 'border-red-500 dark:border-red-400')}
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
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
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
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div className="md:col-span-3">
          <label className="form-label">
            Payment Method (Optional)
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className={theme.select}
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
      <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white dark:text-white mb-3">Transaction Preview</h4>
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 dark:border-gray-600">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{selectedType?.icon}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{formData.description || 'Transaction Description'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {formData.category || 'Category'} • {new Date(formData.date).toLocaleDateString()}
                {formData.paymentMethod && ` • ${formData.paymentMethod}`}
              </p>
              {formData.bankAccountId && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {bankAccounts.find(acc => acc.id === formData.bankAccountId)?.bank} ({bankAccounts.find(acc => acc.id === formData.bankAccountId)?.number})
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${selectedType?.color || 'text-gray-900'}`}>
              {formData.type === 'income' ? '+' : '-'}₹{formData.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{formData.type}</p>
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
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ₹{amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Entity Linking Section */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h3 className={cn(theme.textPrimary, 'font-medium')}>Entity Linking</h3>
            {entityLinks.length > 0 && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                {entityLinks.length} linked
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {suggestedLinks.length > 0 && (
              <button
                type="button"
                onClick={() => setEntityLinks(suggestedLinks)}
                className={cn(theme.btnSecondary, 'text-sm flex items-center')}
                disabled={isGeneratingLinks}
              >
                <Brain className="w-4 h-4 mr-1" />
                Apply Suggestions ({suggestedLinks.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLinkingSection(!showLinkingSection)}
              className={cn(theme.btnSecondary, 'text-sm')}
            >
              {showLinkingSection ? 'Hide' : 'Show'} Links
            </button>
          </div>
        </div>

        {/* Current Links */}
        {entityLinks.length > 0 && (
          <div className="mb-4">
            <h4 className={cn(theme.textMuted, 'text-sm mb-2')}>Current Links</h4>
            <div className="space-y-2">
              {entityLinks.map((link, index) => {
                const Icon = link.entityType === 'goal' ? Target : 
                           link.entityType === 'insurance' ? Shield : TrendingUp;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className={cn(
                        'w-4 h-4',
                        link.entityType === 'goal' ? 'text-blue-600' :
                        link.entityType === 'insurance' ? 'text-green-600' : 'text-purple-600'
                      )} />
                      <div>
                        <p className={theme.textPrimary}>{link.entityName}</p>
                        <p className={cn(theme.textMuted, 'text-sm')}>
                          ₹{link.amount.toLocaleString()} ({link.percentage.toFixed(1)}%)
                          {link.linkType === 'auto' && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Auto</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEntityLinks(prev => prev.filter((_, i) => i !== index))}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested Links */}
        {suggestedLinks.length > 0 && entityLinks.length === 0 && (
          <div className="mb-4">
            <h4 className={cn(theme.textMuted, 'text-sm mb-2')}>
              Suggested Links {isGeneratingLinks && <span className="animate-pulse">(Generating...)</span>}
            </h4>
            <div className="space-y-2">
              {suggestedLinks.slice(0, 3).map((link, index) => {
                const Icon = link.entityType === 'goal' ? Target : 
                           link.entityType === 'insurance' ? Shield : TrendingUp;
                return (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className={cn(
                        'w-4 h-4',
                        link.entityType === 'goal' ? 'text-blue-600' :
                        link.entityType === 'insurance' ? 'text-green-600' : 'text-purple-600'
                      )} />
                      <div>
                        <p className={theme.textPrimary}>{link.entityName}</p>
                        <p className={cn(theme.textMuted, 'text-sm')}>
                          ₹{formData.amount.toLocaleString()} (100%)
                          <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Suggested
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEntityLinks([{...link, amount: formData.amount}])}
                      className={cn(theme.btnSecondary, 'text-sm')}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual Link Form */}
        {showLinkingSection && (
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Add Manual Link</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className={theme.select}>
                <option value="">Select entity type...</option>
                <option value="goal">Goal</option>
                <option value="insurance">Insurance</option>
                <option value="asset">Asset</option>
              </select>
              <select className={theme.select}>
                <option value="">Select entity...</option>
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.name}</option>
                ))}
              </select>
              <button
                type="button"
                className={cn(theme.btnSecondary, 'flex items-center justify-center')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Link
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
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