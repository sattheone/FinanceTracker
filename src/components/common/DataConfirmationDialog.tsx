import React, { useState, useRef } from 'react';
import { Check, X, AlertTriangle, ChevronDown } from 'lucide-react';

import { Category } from '../../constants/categories';
import InlineCategoryEditor from '../transactions/InlineCategoryEditor';
import InlineAccountPicker from '../transactions/InlineAccountPicker';
import { BankAccount } from '../../types';
import AutoCategorizationService from '../../services/autoCategorization';

interface DataConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmedData: any[], isHistorical?: boolean, targetAccountId?: string) => void;
  data: any[];
  type: 'assets' | 'transactions' | 'insurance';
  title: string;
  categories?: Category[];
  accountName?: string;
  accounts?: BankAccount[];
  selectedAccountId?: string;
  onAccountChange?: (accountId: string) => void;
  onCategoryChange?: (item: any, newCategory: string) => void;
  lastCreatedRule?: any;
}

const DataConfirmationDialog: React.FC<DataConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  type,
  title,
  categories = [],
  accounts = [],
  selectedAccountId = '',
  onAccountChange,
  onCategoryChange,
  lastCreatedRule
}) => {
  const [editableData, setEditableData] = useState(data);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(data.map((_, index) => index))
  );
  const [isHistorical, setIsHistorical] = useState(false);
  const [accountId, setAccountId] = useState<string>(selectedAccountId);
  const lastClickedIndexRef = useRef<number | null>(null);

  // Update editableData when data prop changes
  React.useEffect(() => {
    setEditableData(data);
    setSelectedItems(new Set(data.map((_, index) => index)));
  }, [data]);

  // Apply last created rule to all matching items
  React.useEffect(() => {
    if (lastCreatedRule && type === 'transactions') {
      setEditableData(prev => {
        let hasChanges = false;
        const newData = prev.map(item => {
          if (AutoCategorizationService.matchesRule(lastCreatedRule, item.description)) {
            // Apply category
            if (item.category !== lastCreatedRule.categoryId) {
              hasChanges = true;
              return { ...item, category: lastCreatedRule.categoryId };
            }
          }
          return item;
        });

        if (hasChanges) {
          console.log('Applied new rule to extracted transactions');
          return newData;
        }
        return prev;
      });
    }
  }, [lastCreatedRule]);

  if (!isOpen) return null;

  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleItemCheckboxClick = (index: number, e: React.MouseEvent<HTMLInputElement>) => {
    const select = (e.currentTarget as HTMLInputElement).checked;
    if (e.shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      setSelectedItems(prev => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (select) next.add(i); else next.delete(i);
        }
        return next;
      });
    } else {
      // Toggle single
      setSelectedItems(prev => {
        const next = new Set(prev);
        if (select) next.add(index); else next.delete(index);
        return next;
      });
    }
    lastClickedIndexRef.current = index;
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    setEditableData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };

      // Trigger callback for category changes
      if (field === 'category' && onCategoryChange) {
        onCategoryChange(newData[index], value);
      }

      return newData;
    });
  };

  const handleConfirm = () => {
    // Keep the dialog (and the user's edits) open until an account is chosen
    if (type === 'transactions' && !accountId) return;
    const confirmedData = editableData.filter((_, index) => selectedItems.has(index));
    onConfirm(confirmedData, isHistorical, accountId);
    onClose();
  };

  const renderAssetItem = (item: any, index: number) => (
    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedItems.has(index)}
            onChange={() => handleItemToggle(index)}
            className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition duration-150 ease-in-out cursor-pointer"
            style={{ width: '1rem', height: '1rem' }}
          />
          <div className="flex items-center">
            {item.confidence < 0.7 && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
            )}
            <span className="font-medium text-gray-900 dark:text-white">Asset {index + 1}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${item.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:text-green-300' :
          item.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:text-red-300'
          }`}>
          {Math.round(item.confidence * 100)}% confident
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            value={item.category}
            onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="stocks">Stocks</option>
            <option value="mutual_funds">Mutual Funds</option>
            <option value="fixed_deposit">Fixed Deposit</option>
            <option value="gold">Gold</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value</label>
          <input
            type="number"
            value={item.currentValue}
            onChange={(e) => handleFieldChange(index, 'currentValue', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Value (Optional)</label>
          <input
            type="number"
            value={item.purchaseValue || ''}
            onChange={(e) => handleFieldChange(index, 'purchaseValue', Number(e.target.value) || undefined)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>
    </div>
  );

  const getExpenseCategories = () => [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
    'Healthcare', 'Education', 'Travel', 'Groceries', 'Fuel', 'Insurance', 'Investment',
    'Cash Withdrawal', 'Transfer', 'Loan/EMI', 'Other Expense'
  ];

  const getIncomeCategories = () => [
    'Salary', 'Business Income', 'Investment Returns', 'Interest', 'Dividend',
    'Freelance', 'Rental Income', 'Bonus', 'Refund', 'Gift', 'Other Income'
  ];

  const getCategoryOptions = (type: string) => {
    if (type === 'expense') return getExpenseCategories();
    if (type === 'income') return getIncomeCategories();
    if (type === 'investment') return ['Mutual Fund', 'Stocks', 'FD', 'Gold', 'Crypto', 'Other Investment'];
    if (type === 'insurance') return ['Life Insurance', 'Health Insurance', 'Vehicle Insurance', 'Other Insurance'];
    return ['Other'];
  };

  const getTypeStyle = (txType: string): React.CSSProperties => {
    switch (txType) {
      case 'income': return { color: 'var(--color-success)', backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)' };
      case 'expense': return { color: 'var(--color-error)', backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)' };
      case 'investment': return { color: 'var(--color-accent-primary)', backgroundColor: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent-primary) 25%, transparent)' };
      default: return { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' };
    }
  };

  const getConfidenceStyle = (conf: number): React.CSSProperties => {
    if (conf >= 0.8) return { color: 'var(--color-success)', backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)' };
    if (conf >= 0.6) return { color: 'var(--color-warning, #b45309)', backgroundColor: 'color-mix(in srgb, #b45309 10%, transparent)' };
    return { color: 'var(--color-error)', backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderTransactionTable = () => (
    <div className="space-y-3">
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        <div
          className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedItems.size === editableData.length}
              onChange={(e) => setSelectedItems(e.target.checked ? new Set(editableData.map((_, i) => i)) : new Set())}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-medium theme-text-primary">Select All</span>
          </label>
          <span className="theme-text-muted text-xs">{selectedItems.size} / {editableData.length} selected</span>
        </div>

        {editableData.map((item, index) => (
          <div
            key={index}
            className="rounded-xl p-3 space-y-2"
            style={{
              backgroundColor: selectedItems.has(index) ? 'color-mix(in srgb, var(--color-accent-primary) 6%, var(--color-card-bg))' : 'var(--color-card-bg)',
              border: `1px solid ${selectedItems.has(index) ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedItems.has(index)} onChange={() => handleItemToggle(index)} className="w-4 h-4 cursor-pointer" />
                <input type="date" value={item.date} onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                  className="input-field theme-input text-xs py-1" style={{ colorScheme: 'auto' }} />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={getConfidenceStyle(item.confidence)}>
                {Math.round(item.confidence * 100)}%
              </span>
            </div>
            <input type="text" value={item.description} onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
              className="input-field theme-input w-full text-xs" placeholder="Description" />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={item.amount} onChange={(e) => handleFieldChange(index, 'amount', Number(e.target.value))}
                className="input-field theme-input text-xs" min="0" step="0.01" />
              <select value={item.type} onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                className="input-field theme-input text-xs rounded-lg px-1" style={getTypeStyle(item.type)}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="investment">Investment</option>
                <option value="insurance">Insurance</option>
              </select>
              <InlineCategoryEditor
                currentCategory={item.category || 'uncategorized'}
                onSave={(categoryId) => handleFieldChange(index, 'category', categoryId)}
                renderTrigger={(onClick) => {
                  const cat = categories.find(c => c.id === item.category);
                  return (
                    <button type="button" onClick={onClick}
                      className="input-field theme-input text-xs flex items-center gap-1 truncate">
                      <span>{cat?.icon || '❓'}</span>
                      <span className="truncate">{cat?.name || 'Other'}</span>
                    </button>
                  );
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-primary)' }}>
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '2.5rem' }} />
            <col style={{ width: '9rem' }} />
            <col />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '10rem' }} />
            <col style={{ width: '5rem' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}>
              <th className="px-3 py-2.5">
                <input type="checkbox"
                  checked={selectedItems.size === editableData.length}
                  onChange={(e) => setSelectedItems(e.target.checked ? new Set(editableData.map((_, i) => i)) : new Set())}
                  className="w-4 h-4 cursor-pointer" />
              </th>
              {['Date', 'Description', 'Amount', 'Type', 'Category', 'Conf.'].map(h => (
                <th key={h} className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide theme-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'var(--color-card-bg)' }}>
            {editableData.map((item, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: selectedItems.has(index) ? 'color-mix(in srgb, var(--color-accent-primary) 5%, var(--color-card-bg))' : undefined,
                  borderTop: '1px solid var(--color-border-primary)',
                }}
              >
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedItems.has(index)}
                    onClick={(e) => handleItemCheckboxClick(index, e)}
                    className="w-4 h-4 cursor-pointer" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="date" value={item.date}
                    onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                    className="input-field theme-input w-full text-xs py-1" style={{ colorScheme: 'auto' }} />
                </td>
                <td className="px-2 py-1.5">
                  <div className="relative group">
                    <input type="text" value={item.description}
                      onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                      className="input-field theme-input w-full text-xs py-1 truncate"
                      placeholder="Description" title={item.description} />
                    {item.description?.length > 40 && (
                      <div className="absolute bottom-full left-0 mb-1.5 px-2.5 py-1.5 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 max-w-sm whitespace-normal pointer-events-none"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-primary)' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs theme-text-muted pointer-events-none">₹</span>
                    <input type="number" value={item.amount}
                      onChange={(e) => handleFieldChange(index, 'amount', Number(e.target.value))}
                      className="input-field theme-input w-full text-xs py-1 pl-6"
                      min="0" step="0.01" />
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <select value={item.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      handleFieldChange(index, 'type', newType);
                      handleFieldChange(index, 'category', categories.length > 0 ? 'uncategorized' : (getCategoryOptions(newType)[0] || ''));
                    }}
                    className="w-full text-xs font-medium rounded-lg px-2 py-1 transition-colors"
                    style={getTypeStyle(item.type)}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="investment">Investment</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <InlineCategoryEditor
                    currentCategory={item.category || 'uncategorized'}
                    onSave={(categoryId) => handleFieldChange(index, 'category', categoryId)}
                    renderTrigger={(onClick) => {
                      const cat = categories.find(c => c.id === item.category);
                      return (
                        <button type="button" onClick={onClick}
                          className="w-full flex items-center justify-between text-xs rounded-lg px-2 py-1 transition-colors"
                          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
                          <span className="flex items-center gap-1 truncate">
                            <span>{cat?.icon || '❓'}</span>
                            <span className="truncate">{cat?.name || 'Uncategorized'}</span>
                          </span>
                          <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full" style={getConfidenceStyle(item.confidence)}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInsuranceItem = (item: any, index: number) => (
    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedItems.has(index)}
            onChange={() => handleItemToggle(index)}
            className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition duration-150 ease-in-out cursor-pointer"
            style={{ width: '1rem', height: '1rem' }}
          />
          <div className="flex items-center">
            {item.confidence < 0.7 && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
            )}
            <span className="font-medium text-gray-900 dark:text-white">Policy {index + 1}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${item.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:text-green-300' :
          item.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:text-red-300'
          }`}>
          {Math.round(item.confidence * 100)}% confident
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Name</label>
          <input
            type="text"
            value={item.policyName}
            onChange={(e) => handleFieldChange(index, 'policyName', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            value={item.type}
            onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="term">Term</option>
            <option value="endowment">Endowment</option>
            <option value="health">Health</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Amount</label>
          <input
            type="number"
            value={item.coverAmount}
            onChange={(e) => handleFieldChange(index, 'coverAmount', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Premium Amount</label>
          <input
            type="number"
            value={item.premiumAmount}
            onChange={(e) => handleFieldChange(index, 'premiumAmount', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (type === 'transactions') {
      return renderTransactionTable();
    }

    // For assets and insurance, keep the original card layout
    return (
      <div className="space-y-4">
        {editableData.map((item, index) => {
          switch (type) {
            case 'assets':
              return renderAssetItem(item, index);
            case 'insurance':
              return renderInsuranceItem(item, index);
            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl max-w-7xl w-full max-h-[95vh] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)' }}>

        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold theme-text-primary">{title}</h2>
              <p className="text-sm theme-text-muted mt-0.5">Review and edit before saving to your account</p>
              {type === 'transactions' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs theme-text-muted">Account</span>
                  <div className="w-64">
                    <InlineAccountPicker
                      currentAccountId={accountId}
                      onSave={(id) => { setAccountId(id); onAccountChange?.(id); }}
                      renderTrigger={(onClick) => {
                        const selected = accounts.find(a => a.id === accountId);
                        return (
                          <button type="button" onClick={onClick}
                            className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-sm transition-colors"
                            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
                            <span className="flex items-center gap-2 truncate">
                              <span>{selected?.logo || '🏦'}</span>
                              <span className="truncate">{selected ? `${selected.bank} ••••${selected.number?.slice(-4)}` : 'Select account'}</span>
                            </span>
                            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          </button>
                        );
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {editableData.length > 0 && (
          <div className="px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="font-medium theme-text-primary">Found {editableData.length} {type === 'transactions' ? 'transactions' : 'items'}</span>
              {type === 'transactions' && (
                <>
                  <span className="flex items-center gap-1 theme-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                    Income: {editableData.filter(t => t.type === 'income').length}
                  </span>
                  <span className="flex items-center gap-1 theme-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} />
                    Expenses: {editableData.filter(t => t.type === 'expense').length}
                  </span>
                  <span className="flex items-center gap-1 theme-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)' }} />
                    Investments: {editableData.filter(t => t.type === 'investment').length}
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setSelectedItems(new Set(editableData.map((_, i) => i)))}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors btn-secondary !py-1">Select All</button>
              <button onClick={() => setSelectedItems(new Set())}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors btn-secondary !py-1">Select None</button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {editableData.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="font-medium theme-text-primary">No data extracted</p>
              <p className="text-sm theme-text-muted mt-1">The AI couldn't find any relevant financial data.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              {renderContent()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex justify-between items-center flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-sm theme-text-secondary">
              <span>Selected: <strong className="theme-text-primary">{selectedItems.size}</strong> of {editableData.length}</span>
              {type === 'transactions' && selectedItems.size > 0 && (
                <span>Total: <strong className="theme-text-primary">{formatCurrency(
                  editableData.filter((_, i) => selectedItems.has(i)).reduce((s, item) => s + (item.amount || 0), 0)
                )}</strong></span>
              )}
            </div>
            {type === 'transactions' && (
              <label className="flex items-center gap-2 text-xs theme-text-muted cursor-pointer">
                <input type="checkbox" checked={isHistorical} onChange={(e) => setIsHistorical(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer" />
                Historical data (keep current balance unchanged)
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleConfirm}
              disabled={selectedItems.size === 0 || (type === 'transactions' && !accountId)}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Check className="w-4 h-4" />
              Add {selectedItems.size} {selectedItems.size === 1 ? 'Transaction' : 'Transactions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataConfirmationDialog;