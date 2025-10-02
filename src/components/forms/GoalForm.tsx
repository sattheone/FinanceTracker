import React, { useState, useEffect } from 'react';
import { Goal } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (goal: Omit<Goal, 'id'>) => void;
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ goal, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    monthlyContribution: 0,
    category: 'other' as Goal['category'],
    expectedReturnRate: 12, // Default 12% annual return
    isInflationAdjusted: false, // Default to nominal values
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedSIP, setCalculatedSIP] = useState(0);

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        monthlyContribution: goal.monthlyContribution,
        category: goal.category,
        expectedReturnRate: goal.expectedReturnRate || 12,
        isInflationAdjusted: goal.isInflationAdjusted || false,
      });
    }
  }, [goal]);

  const goalCategories = [
    { value: 'retirement', label: 'Retirement', icon: '🏖️' },
    { value: 'education', label: 'Education', icon: '🎓' },
    { value: 'marriage', label: 'Marriage', icon: '💒' },
    { value: 'other', label: 'Other', icon: '🎯' },
  ];

  const calculateRequiredSIP = () => {
    if (!formData.targetAmount || !formData.targetDate) return 0;

    const target = new Date(formData.targetDate);
    const now = new Date();
    const monthsRemaining = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    // Use user-specified expected return rate
    const monthlyRate = formData.expectedReturnRate / 100 / 12;
    const futureValueOfCurrent = formData.currentAmount * Math.pow(1 + monthlyRate, monthsRemaining);
    const remainingAmount = Math.max(0, formData.targetAmount - futureValueOfCurrent);
    
    if (remainingAmount === 0) return 0;
    
    // PMT calculation for SIP
    const requiredSIP = remainingAmount * monthlyRate / (Math.pow(1 + monthlyRate, monthsRemaining) - 1);
    return Math.ceil(requiredSIP);
  };

  useEffect(() => {
    setCalculatedSIP(calculateRequiredSIP());
  }, [formData.targetAmount, formData.currentAmount, formData.targetDate, formData.expectedReturnRate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (formData.currentAmount < 0) {
      newErrors.currentAmount = 'Current amount cannot be negative';
    }

    if (formData.currentAmount > formData.targetAmount) {
      newErrors.currentAmount = 'Current amount cannot exceed target amount';
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

    if (formData.monthlyContribution < 0) {
      newErrors.monthlyContribution = 'Monthly contribution cannot be negative';
    }

    if (formData.expectedReturnRate <= 0 || formData.expectedReturnRate > 50) {
      newErrors.expectedReturnRate = 'Expected return rate must be between 0.1% and 50%';
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
      targetAmount: formData.targetAmount,
      currentAmount: formData.currentAmount,
      targetDate: formData.targetDate,
      monthlyContribution: formData.monthlyContribution,
      category: formData.category,
      expectedReturnRate: formData.expectedReturnRate,
      isInflationAdjusted: formData.isInflationAdjusted,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const useSuggestedSIP = () => {
    setFormData(prev => ({ ...prev, monthlyContribution: calculatedSIP }));
  };

  const progress = formData.targetAmount > 0 ? (formData.currentAmount / formData.targetAmount) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">
            Goal Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field ${errors.name ? 'border-red-500' : ''}`}
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
            className="input-field"
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
              className={`input-field pl-8 ${errors.targetAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>
          {errors.targetAmount && <p className="text-red-500 text-sm mt-1">{errors.targetAmount}</p>}
        </div>

        <div>
          <label className="form-label">
            Current Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.currentAmount || ''}
              onChange={(e) => handleChange('currentAmount', Number(e.target.value))}
              className={`input-field pl-8 ${errors.currentAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>
          {errors.currentAmount && <p className="text-red-500 text-sm mt-1">{errors.currentAmount}</p>}
        </div>

        <div>
          <label className="form-label">
            Target Date *
          </label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => handleChange('targetDate', e.target.value)}
            className={`input-field ${errors.targetDate ? 'border-red-500' : ''}`}
            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
          />
          {errors.targetDate && <p className="text-red-500 text-sm mt-1">{errors.targetDate}</p>}
        </div>

        <div>
          <label className="form-label">
            Monthly SIP
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.monthlyContribution || ''}
              onChange={(e) => handleChange('monthlyContribution', Number(e.target.value))}
              className={`input-field pl-8 ${errors.monthlyContribution ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="100"
            />
          </div>
          {errors.monthlyContribution && <p className="text-red-500 text-sm mt-1">{errors.monthlyContribution}</p>}
          
          {calculatedSIP > 0 && calculatedSIP !== formData.monthlyContribution && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              <span className="text-blue-700">
                Suggested SIP: {formatCurrency(calculatedSIP)}
              </span>
              <button
                type="button"
                onClick={useSuggestedSIP}
                className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 underline"
              >
                Use this
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="form-label">
            Expected Annual Return Rate *
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.expectedReturnRate || ''}
              onChange={(e) => handleChange('expectedReturnRate', Number(e.target.value))}
              className={`input-field pr-8 ${errors.expectedReturnRate ? 'border-red-500' : ''}`}
              placeholder="12"
              min="0.1"
              max="50"
              step="0.1"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Expected annual return from your investments (e.g., 12% for equity mutual funds)
          </p>
          {errors.expectedReturnRate && <p className="text-red-500 text-sm mt-1">{errors.expectedReturnRate}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
            Target Amount Type
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="inflationAdjusted"
                checked={!formData.isInflationAdjusted}
                onChange={() => handleChange('isInflationAdjusted', false)}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                <strong>Nominal Value</strong> - Today's purchasing power (₹{formatCurrency(formData.targetAmount)} in today's money)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="inflationAdjusted"
                checked={formData.isInflationAdjusted}
                onChange={() => handleChange('isInflationAdjusted', true)}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                <strong>Inflation-Adjusted</strong> - Future purchasing power (₹{formatCurrency(formData.targetAmount)} will have today's buying power)
              </span>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Choose whether your target amount accounts for inflation. For long-term goals like retirement, 
            inflation-adjusted is recommended.
          </p>
        </div>
      </div>

      {/* Progress Visualization */}
      {formData.targetAmount > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Goal Progress</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatCurrency(formData.currentAmount)}</span>
              <span>Remaining: {formatCurrency(Math.max(0, formData.targetAmount - formData.currentAmount))}</span>
              <span>{formatCurrency(formData.targetAmount)}</span>
            </div>
          </div>

          {formData.targetDate && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              <span>Target Date: {new Date(formData.targetDate).toLocaleDateString()}</span>
              <span className="ml-4">
                Time Remaining: {Math.max(0, Math.ceil((new Date(formData.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))} months
              </span>
            </div>
          )}
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
          {goal ? 'Update Goal' : 'Add Goal'}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;