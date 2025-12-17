import React, { useState } from 'react';
import { Check, X, AlertTriangle, DollarSign, Calendar, Tag } from 'lucide-react';

import { Category } from '../../constants/categories';

interface DataConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmedData: any[]) => void;
  data: any[];
  type: 'assets' | 'transactions' | 'insurance';
  title: string;
  categories?: Category[];
}

const DataConfirmationDialog: React.FC<DataConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  type,
  title,
  categories = []
}) => {
  const [editableData, setEditableData] = useState(data);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(data.map((_, index) => index))
  );

  // Update editableData when data prop changes
  React.useEffect(() => {
    setEditableData(data);
    setSelectedItems(new Set(data.map((_, index) => index)));
  }, [data]);

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

  const handleFieldChange = (index: number, field: string, value: any) => {
    const newData = [...editableData];
    newData[index] = { ...newData[index], [field]: value };
    setEditableData(newData);
  };

  const handleConfirm = () => {
    const confirmedData = editableData.filter((_, index) => selectedItems.has(index));
    onConfirm(confirmedData);
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
            className="mr-3 h-4 w-4 text-primary-600 rounded"
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
          <select
            value={item.category}
            onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Current Value</label>
          <input
            type="number"
            value={item.currentValue}
            onChange={(e) => handleFieldChange(index, 'currentValue', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Purchase Value (Optional)</label>
          <input
            type="number"
            value={item.purchaseValue || ''}
            onChange={(e) => handleFieldChange(index, 'purchaseValue', Number(e.target.value) || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'expense': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'investment': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      case 'insurance': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-3 py-3 text-left w-12">
              <input
                type="checkbox"
                checked={selectedItems.size === editableData.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItems(new Set(editableData.map((_, i) => i)));
                  } else {
                    setSelectedItems(new Set());
                  }
                }}
                className="h-4 w-4 text-primary-600 rounded"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Date
              </div>
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Description
              <span className="text-gray-400 font-normal normal-case ml-1 text-xs">(hover for full)</span>
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Amount
              </div>
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
              Type
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-1" />
                Category
              </div>
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
              Confidence
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
          {editableData.map((item, index) => (
            <tr key={index} className={`hover:bg-gray-50 ${selectedItems.has(index) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedItems.has(index)}
                  onChange={() => handleItemToggle(index)}
                  className="h-4 w-4 text-primary-600 rounded"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </td>
              <td className="px-3 py-2">
                <div className="relative group">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 truncate"
                    placeholder="Transaction description"
                    title={item.description} // Native tooltip as fallback
                  />
                  {item.description && item.description.length > 40 && (
                    <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 max-w-md whitespace-normal pointer-events-none">
                      {item.description}
                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">₹</span>
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => handleFieldChange(index, 'amount', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </td>
              <td className="px-3 py-2">
                <select
                  value={item.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    handleFieldChange(index, 'type', newType);
                    // Auto-update category when type changes
                    const categories = getCategoryOptions(newType);
                    if (categories.length > 0) {
                      handleFieldChange(index, 'category', categories[0]);
                    }
                  }}
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${getTypeColor(item.type)}`}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="investment">Investment</option>
                  <option value="insurance">Insurance</option>
                </select>
              </td>
              <td className="px-3 py-2">
                <select
                  value={item.category}
                  onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  {/* Default Option if value is missing */}
                  {!item.category && <option value="">Select Category</option>}

                  {/* Dynamic Options */}
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))
                  ) : (
                    // Fallback Hardcoded Options (Legacy)
                    getCategoryOptions(item.type).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))
                  )}
                </select>
              </td>
              <td className="px-3 py-2 text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:text-green-300' :
                  item.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:text-yellow-300' :
                    'bg-red-100 text-red-700 dark:text-red-300'
                  }`}>
                  {Math.round(item.confidence * 100)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
            className="mr-3 h-4 w-4 text-primary-600 rounded"
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Policy Name</label>
          <input
            type="text"
            value={item.policyName}
            onChange={(e) => handleFieldChange(index, 'policyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Type</label>
          <select
            value={item.type}
            onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
          >
            <option value="term">Term</option>
            <option value="endowment">Endowment</option>
            <option value="health">Health</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Cover Amount</label>
          <input
            type="number"
            value={item.coverAmount}
            onChange={(e) => handleFieldChange(index, 'coverAmount', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Premium Amount</label>
          <input
            type="number"
            value={item.premiumAmount}
            onChange={(e) => handleFieldChange(index, 'premiumAmount', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm theme-input"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Review and edit the extracted data before adding to your account
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {editableData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No data extracted</p>
              <p className="text-sm">The AI couldn't find any relevant financial data in the image.</p>
            </div>
          ) : (
            <div>
              {/* Summary Header */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Found {editableData.length} {type === 'transactions' ? 'transactions' : 'items'}
                    </p>
                    {type === 'transactions' && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          Income: {editableData.filter(t => t.type === 'income').length}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                          Expenses: {editableData.filter(t => t.type === 'expense').length}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                          Investments: {editableData.filter(t => t.type === 'investment').length}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedItems(new Set(editableData.map((_, i) => i)))}
                      className="text-xs px-3 py-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedItems(new Set())}
                      className="text-xs px-3 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded"
                    >
                      Select None
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {renderContent()}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
            <span>Selected: {selectedItems.size} of {editableData.length}</span>
            {type === 'transactions' && selectedItems.size > 0 && (
              <span>
                Total Amount: {formatCurrency(
                  editableData
                    .filter((_, index) => selectedItems.has(index))
                    .reduce((sum, item) => sum + (item.amount || 0), 0)
                )}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedItems.size === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors shadow-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Add {selectedItems.size} {selectedItems.size === 1 ? 'Transaction' : 'Transactions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataConfirmationDialog;