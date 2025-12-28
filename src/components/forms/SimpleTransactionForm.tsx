import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';
import AutoCategorizationService from '../../services/autoCategorization';
import InlineCategoryEditor from '../transactions/InlineCategoryEditor';
import InlineAccountPicker from '../transactions/InlineAccountPicker';
import { ChevronDown, Calendar, Tag, FileText } from 'lucide-react';


export interface SimpleTransactionFormHandle {
  submit: () => void;
}

interface SimpleTransactionFormProps {
  transaction?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  hideActions?: boolean;
  autoSave?: boolean;
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

const SimpleTransactionForm = forwardRef<SimpleTransactionFormHandle, SimpleTransactionFormProps>(({
  transaction,
  onSubmit,
  onCancel,
  hideActions = false,
  autoSave = false,
  onSaveStatusChange
}, ref) => {
  const { bankAccounts, categories: contextCategories } = useData();

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
    notes: '',
    tags: [] as string[]
  });

  const dateInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isFormDirty = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        notes: (transaction as any).notes || '',
        tags: transaction.tags || []
      });
      // Reset dirty flag on transaction load
      isFormDirty.current = false;
    } else {
      setFormData(prev => ({
        ...prev,
        date: new Date().toISOString().split('T')[0],
        type: 'expense'
      }));
    }
  }, [transaction]);

  // Auto-save Logic
  useEffect(() => {
    if (!autoSave || !isFormDirty.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    onSaveStatusChange?.('saving');

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (validateForm()) {
        const transactionData: Omit<Transaction, 'id'> = {
          date: formData.date,
          description: formData.description.trim(),
          category: formData.category,
          type: formData.type,
          amount: formData.amount,
          paymentMethod: formData.paymentMethod || undefined,
          bankAccountId: formData.bankAccountId || undefined,
          tags: formData.tags
        };
        // Quick hack for notes
        if ('notes' in ({} as unknown as Transaction)) {
          (transactionData as any).notes = formData.notes;
        }

        onSubmit(transactionData);
        onSaveStatusChange?.('saved');
      } else {
        onSaveStatusChange?.('error');
      }
    }, 1000); // 1s debounce

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formData, autoSave]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.bankAccountId) newErrors.bankAccountId = 'Account is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const transactionData: Omit<Transaction, 'id'> = {
      date: formData.date,
      description: formData.description.trim(),
      category: formData.category,
      type: formData.type,
      amount: formData.amount,
      paymentMethod: formData.paymentMethod || undefined,
      bankAccountId: formData.bankAccountId || undefined,
      tags: formData.tags
    };
    // Quick hack: if notes exists in type, add it.
    if ('notes' in ({} as unknown as Transaction)) {
      (transactionData as any).notes = formData.notes;
    }

    onSubmit(transactionData);
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit();
    }
  }));

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    isFormDirty.current = true; // Mark as dirty on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // ... rest of handleChange logic logic for category suggestion
    if (field === 'description' && value.length > 3) {
      const result = AutoCategorizationService.suggestCategoryForTransaction(
        value,
        formData.amount,
        formData.type
      );
      if (!formData.category || formData.category === '') {
        setFormData(prev => ({ ...prev, category: result.categoryId }));
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 dark:text-green-400';
      case 'expense': return 'text-gray-900 dark:text-white'; // Default for expense usually
      case 'investment': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-900 dark:text-white';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-2 py-4">
      {/* Top Row: Date & Type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 cursor-pointer relative" onClick={() => dateInputRef.current?.showPicker()}>
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">
            {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="absolute bottom-0 left-0 opacity-0 w-0 h-0 pointer-events-none"
          />
        </div>

        <div className="relative group">
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="appearance-none bg-transparent border-none text-right text-sm font-semibold cursor-pointer focus:ring-0 focus:outline-none pr-6 uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>
      </div>


      {/* Hero Section: Description & Amount */}
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Transaction Name"
            className={`w-full bg-transparent border-none p-0 text-xl font-bold placeholder-gray-300 dark:placeholder-gray-600 focus:ring-0 focus:outline-none ${errors.description ? 'placeholder-red-300' : 'text-gray-900 dark:text-white'}`}
            autoFocus
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        <div className="flex items-baseline">
          <span className={`text-xl mr-1 font-medium ${getTypeColor(formData.type)}`}>
            ₹
          </span>
          <input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => handleChange('amount', Number(e.target.value))}
            placeholder="0"
            className={`w-full bg-transparent border-none p-0 text-3xl font-bold bg-transparent focus:ring-0 focus:outline-none ${getTypeColor(formData.type)}`}
            min="0"
            step="0.01"
          />
        </div>
        {errors.amount && <p className="text-red-500 text-xs">{errors.amount}</p>}
      </div>

      {/* Meta Row: Pills for Category & Account */}
      <div className="flex flex-wrap gap-3">
        {/* Category Pill */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Category</label>
          <InlineCategoryEditor
            currentCategory={formData.category}
            onSave={(id) => handleChange('category', id)}
            renderTrigger={(onClick) => {
              const selectedCategory = categories.find(c => c.id === formData.category);
              return (
                <button
                  type="button"
                  onClick={onClick}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all w-full text-left ${selectedCategory
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dashed-border border-gray-300'
                    } hover:bg-gray-200 dark:hover:bg-gray-700 ${errors.category ? 'ring-1 ring-red-500' : ''}`}
                >
                  <span className="text-lg">{selectedCategory?.icon || '🏷️'}</span>
                  <span className="font-medium truncate">{selectedCategory?.name || 'Select Category'}</span>
                </button>
              );
            }}
          />
        </div>

        {/* Account Pill */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Account</label>
          <InlineAccountPicker
            currentAccountId={formData.bankAccountId}
            onSave={(id) => handleChange('bankAccountId', id)}
            renderTrigger={(onClick) => {
              const selectedAccount = bankAccounts.find(a => a.id === formData.bankAccountId);
              return (
                <button
                  type="button"
                  onClick={onClick}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all w-full text-left ${selectedAccount
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dashed-border border-gray-300'
                    } hover:bg-gray-200 dark:hover:bg-gray-700 ${errors.bankAccountId ? 'ring-1 ring-red-500' : ''}`}
                >
                  <span className="text-lg">{selectedAccount?.logo || '🏦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{selectedAccount?.bank || 'Select Account'}</div>
                    {selectedAccount && <div className="text-xs opacity-70 truncate">...{selectedAccount.number.slice(-4)}</div>}
                  </div>
                </button>
              );
            }}
          />
        </div>
      </div>

      {/* Notes & Tags */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center text-gray-500 mb-2">
            <FileText className="w-4 h-4 mr-2" />
            <h4 className="text-xs font-medium uppercase tracking-wide">Notes</h4>
          </div>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg border-none text-sm p-3 focus:ring-0 focus:outline-none resize-none h-20 placeholder-gray-400"
          />
        </div>

        <div>
          <div className="flex items-center text-gray-500 mb-2">
            <Tag className="w-4 h-4 mr-2" />
            <h4 className="text-xs font-medium uppercase tracking-wide">Tags</h4>
          </div>
          <div className="flex items-center">
            <button type="button" className="text-sm text-blue-600 font-medium hover:underline flex items-center">
              <span className="mr-1">+</span> Add tag
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      {
        !hideActions && (
          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {transaction ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        )
      }
    </form >
  );
});

SimpleTransactionForm.displayName = 'SimpleTransactionForm';

export default SimpleTransactionForm;