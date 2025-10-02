import React, { useState, useEffect } from 'react';
import { Asset } from '../../types';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: Omit<Asset, 'id'>) => void;
  onCancel: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ asset, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'stocks' as Asset['category'],
    currentValue: 0,
    purchaseValue: 0,
    purchaseDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        category: asset.category,
        currentValue: asset.currentValue,
        purchaseValue: asset.purchaseValue || 0,
        purchaseDate: asset.purchaseDate || '',
      });
    }
  }, [asset]);

  const assetCategories = [
    { value: 'stocks', label: 'Stocks', icon: '📈' },
    { value: 'mutual_funds', label: 'Mutual Funds', icon: '📊' },
    { value: 'fixed_deposit', label: 'Fixed Deposit', icon: '🏦' },
    { value: 'gold', label: 'Gold', icon: '🥇' },
    { value: 'cash', label: 'Cash/Savings', icon: '💰' },
    { value: 'other', label: 'Other', icon: '💼' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required';
    }

    if (formData.currentValue <= 0) {
      newErrors.currentValue = 'Current value must be greater than 0';
    }

    if (formData.purchaseValue && formData.purchaseValue < 0) {
      newErrors.purchaseValue = 'Purchase value cannot be negative';
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
      name: formData.name.trim(),
      category: formData.category,
      currentValue: formData.currentValue,
      purchaseValue: formData.purchaseValue || undefined,
      purchaseDate: formData.purchaseDate || undefined,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field ${errors.name ? 'border-red-500' : ''}`}
            placeholder="e.g., HDFC Bank, SBI Equity Fund"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="input-field"
          >
            {assetCategories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Value *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.currentValue || ''}
              onChange={(e) => handleChange('currentValue', Number(e.target.value))}
              className={`input-field pl-8 ${errors.currentValue ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.currentValue && <p className="text-red-500 text-sm mt-1">{errors.currentValue}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Value (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.purchaseValue || ''}
              onChange={(e) => handleChange('purchaseValue', Number(e.target.value))}
              className={`input-field pl-8 ${errors.purchaseValue ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.purchaseValue && <p className="text-red-500 text-sm mt-1">{errors.purchaseValue}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Date (Optional)
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleChange('purchaseDate', e.target.value)}
            className="input-field"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Calculated Fields */}
      {formData.purchaseValue > 0 && formData.currentValue > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Calculated Values</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Gain/Loss:</span>
              <span className={`ml-2 font-medium ${
                formData.currentValue >= formData.purchaseValue ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹{(formData.currentValue - formData.purchaseValue).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Return %:</span>
              <span className={`ml-2 font-medium ${
                formData.currentValue >= formData.purchaseValue ? 'text-green-600' : 'text-red-600'
              }`}>
                {(((formData.currentValue - formData.purchaseValue) / formData.purchaseValue) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

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
          {asset ? 'Update Asset' : 'Add Asset'}
        </button>
      </div>
    </form>
  );
};

export default AssetForm;