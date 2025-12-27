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
    investedValue: 0,
    purchaseDate: '',
    symbol: '',
    schemeCode: '',
    isSIP: false,
    sipAmount: 0,
    sipDate: 1, // Day of month (1-31)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        category: asset.category,
        currentValue: asset.currentValue,
        investedValue: asset.investedValue || asset.purchaseValue || 0,
        purchaseDate: asset.purchaseDate || '',
        symbol: (asset as any).symbol || '',
        schemeCode: (asset as any).schemeCode || '',
        isSIP: (asset as any).isSIP || false,
        sipAmount: (asset as any).sipAmount || 0,
        sipDate: (asset as any).sipDate || 1,
      });
    }
  }, [asset]);

  // Auto-calculate invested value for SIP
  useEffect(() => {
    if (formData.isSIP && formData.sipAmount > 0 && formData.purchaseDate) {
      const purchaseDate = new Date(formData.purchaseDate);
      const today = new Date();

      // Calculate months difference from purchase date
      const monthsDiff = (today.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (today.getMonth() - purchaseDate.getMonth()) + 1;

      const calculatedInvestedValue = formData.sipAmount * Math.max(1, monthsDiff);

      setFormData(prev => ({ ...prev, investedValue: calculatedInvestedValue }));
    }
  }, [formData.isSIP, formData.sipAmount, formData.purchaseDate]);

  const assetCategories = [
    { value: 'stocks', label: 'Stocks', icon: '📈' },
    { value: 'mutual_funds', label: 'Mutual Funds', icon: '📊' },
    { value: 'fixed_deposit', label: 'Fixed Deposit', icon: '🏦' },
    { value: 'epf', label: 'EPF (Provident Fund)', icon: '🏛️' },
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

    if (formData.investedValue && formData.investedValue < 0) {
      newErrors.investedValue = 'Invested value cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const assetData: any = {
      name: formData.name.trim(),
      category: formData.category,
      currentValue: formData.currentValue,
      investedValue: formData.investedValue || undefined,
      purchaseDate: formData.purchaseDate || undefined,
      symbol: formData.symbol || undefined,
      schemeCode: formData.schemeCode || undefined,
    };

    // Add SIP/Contribution data for mutual funds and EPF
    if ((formData.category === 'mutual_funds' || formData.category === 'epf') && formData.isSIP) {
      assetData.isSIP = true;
      assetData.sipAmount = formData.sipAmount;
      assetData.sipDate = formData.sipDate;
    }

    onSubmit(assetData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form id="asset-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">
            Asset Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field theme-input ${errors.name ? 'border-red-500' : ''}`}
            placeholder="e.g., HDFC Bank, SBI Equity Fund"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="form-label">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="input-field theme-input"
          >
            {assetCategories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Current Value *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.currentValue || ''}
              onChange={(e) => handleChange('currentValue', Number(e.target.value))}
              className={`input-field theme-input pl-8 ${errors.currentValue ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.currentValue && <p className="text-red-500 text-sm mt-1">{errors.currentValue}</p>}
        </div>

        {/* SIP/Contribution Fields for Mutual Funds and EPF */}
        {(formData.category === 'mutual_funds' || formData.category === 'epf') && (
          <>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isSIP}
                  onChange={(e) => handleChange('isSIP', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {formData.category === 'epf'
                    ? 'Enable Monthly Contribution'
                    : 'This is a SIP (Systematic Investment Plan)'}
                </span>
              </label>
            </div>

            {formData.isSIP && (
              <>
                <div>
                  <label className="form-label">
                    {formData.category === 'epf' ? 'Monthly Contribution Amount *' : 'Monthly SIP Amount *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                    <input
                      type="number"
                      value={formData.sipAmount || ''}
                      onChange={(e) => handleChange('sipAmount', Number(e.target.value))}
                      className="input-field theme-input pl-8"
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    {formData.category === 'epf' ? 'Contribution Date (Day of Month) *' : 'SIP Date (Day of Month) *'}
                  </label>
                  <select
                    value={formData.sipDate}
                    onChange={(e) => handleChange('sipDate', Number(e.target.value))}
                    className="input-field theme-input"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.category === 'epf'
                      ? 'Day of the month when contribution is added'
                      : 'Day of the month when SIP is deducted'}
                  </p>
                </div>
              </>
            )}
          </>
        )}

        <div>
          <label className="form-label">
            Invested Value (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.investedValue || ''}
              onChange={(e) => handleChange('investedValue', Number(e.target.value))}
              className={`input-field theme-input pl-8 ${errors.investedValue ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
              disabled={formData.isSIP && formData.sipAmount > 0 && Boolean(formData.purchaseDate)}
            />
          </div>
          {formData.isSIP && formData.sipAmount > 0 && formData.purchaseDate && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {formData.category === 'epf'
                ? 'Auto-calculated from monthly contributions (based on start date)'
                : 'Auto-calculated from SIP (based on purchase date)'}
            </p>
          )}
          {errors.investedValue && <p className="text-red-500 text-sm mt-1">{errors.investedValue}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="form-label">
            Purchase Date (Optional)
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleChange('purchaseDate', e.target.value)}
            className="input-field theme-input"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Calculated Fields */}
      {formData.investedValue > 0 && formData.currentValue > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Calculated Values</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-300">Gain/Loss:</span>
              <span className={`ml-2 font-medium ${formData.currentValue >= formData.investedValue ? 'text-green-600' : 'text-red-600'}`}>
                ₹{(formData.currentValue - formData.investedValue).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Return %:</span>
              <span className={`ml-2 font-medium ${formData.currentValue >= formData.investedValue ? 'text-green-600' : 'text-red-600'}`}>
                {(((formData.currentValue - formData.investedValue) / formData.investedValue) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

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
          {asset ? 'Update Asset' : 'Add Asset'}
        </button>
      </div>
    </form>
  );
};

export default AssetForm;