import React, { useState, useEffect } from 'react';
import { Goal } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useData } from '../../contexts/DataContext';
import { CheckCircle, Circle } from 'lucide-react';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (goal: Omit<Goal, 'id'>) => void;
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ goal, onSubmit, onCancel }) => {
  const { assets } = useData();
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 0,
    targetDate: '',
    category: 'other' as Goal['category'],
    linkedSIPAssets: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get available SIP assets
  const sipAssets = assets.filter(a => a.isSIP && (a.category === 'mutual_funds' || a.category === 'epf' || a.category === 'stocks'));

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate,
        category: goal.category,
        linkedSIPAssets: goal.linkedSIPAssets || [],
      });
    }
  }, [goal]);

  const goalCategories = [
    { value: 'retirement', label: 'Retirement', icon: '🏖️' },
    { value: 'education', label: 'Education', icon: '🎓' },
    { value: 'marriage', label: 'Marriage', icon: '💒' },
    { value: 'house', label: 'House', icon: '🏠' },
    { value: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
    { value: 'vacation', label: 'Vacation', icon: '✈️' },
    { value: 'other', label: 'Other', icon: '🎯' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else {
      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      if (targetDate <= today) {
        newErrors.targetDate = 'Target date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Calculate total monthly SIP from linked assets
    const totalMonthlySIP = formData.linkedSIPAssets.reduce((sum, assetId) => {
      const asset = sipAssets.find(a => a.id === assetId);
      return sum + (asset?.sipAmount || 0);
    }, 0);

    onSubmit({
      name: formData.name.trim(),
      targetAmount: formData.targetAmount,
      currentAmount: goal?.currentAmount || 0,
      targetDate: formData.targetDate,
      monthlyContribution: totalMonthlySIP,
      category: formData.category,
      expectedReturnRate: 12, // Default 12%
      isInflationAdjusted: false,
      linkedSIPAssets: formData.linkedSIPAssets,
      linkedTransactionCategories: [],
      autoUpdateFromTransactions: true,
      priority: 'medium',
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleSIP = (assetId: string) => {
    const newLinkedSIPs = formData.linkedSIPAssets.includes(assetId)
      ? formData.linkedSIPAssets.filter(id => id !== assetId)
      : [...formData.linkedSIPAssets, assetId];
    handleChange('linkedSIPAssets', newLinkedSIPs);
  };

  const totalMonthlySIP = formData.linkedSIPAssets.reduce((sum, assetId) => {
    const asset = sipAssets.find(a => a.id === assetId);
    return sum + (asset?.sipAmount || 0);
  }, 0);

  return (
    <form id="goal-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">
            Goal Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field theme-input ${errors.name ? 'border-red-500' : ''}`}
            placeholder="e.g., Child's Education, House Down Payment"
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
            {goalCategories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Target Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.targetAmount || ''}
              onChange={(e) => handleChange('targetAmount', Number(e.target.value))}
              className={`input-field theme-input pl-8 ${errors.targetAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>
          {errors.targetAmount && <p className="text-red-500 text-sm mt-1">{errors.targetAmount}</p>}
        </div>

        <div>
          <label className="form-label">
            Target Date *
          </label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => handleChange('targetDate', e.target.value)}
            className={`input-field theme-input ${errors.targetDate ? 'border-red-500' : ''}`}
            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
          />
          {errors.targetDate && <p className="text-red-500 text-sm mt-1">{errors.targetDate}</p>}
        </div>
      </div>

      {/* Link SIP Assets */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Link SIP Assets (Optional)</h4>

        {sipAssets.length === 0 ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              No SIP assets available. Create a SIP asset first to link it to this goal.
            </p>
            <button
              type="button"
              onClick={() => window.location.href = '/assets'}
              className="text-sm text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
            >
              Go to Assets
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sipAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => toggleSIP(asset.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${formData.linkedSIPAssets.includes(asset.id)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {formData.linkedSIPAssets.includes(asset.id) ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {asset.category === 'mutual_funds' ? 'Mutual Fund' : 'EPF'} • {asset.sipDate}th of month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(asset.sipAmount || 0)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                  </div>
                </div>
              ))}
            </div>

            {formData.linkedSIPAssets.length > 0 && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {formData.linkedSIPAssets.length} SIP{formData.linkedSIPAssets.length !== 1 ? 's' : ''} selected
                  </span>
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    Total: {formatCurrency(totalMonthlySIP)}/month
                  </span>
                </div>
              </div>
            )}
          </>
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
          {goal ? 'Update Goal' : 'Add Goal'}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;