import React, { useState, useEffect } from 'react';
import { Liability } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface LiabilityFormProps {
  liability?: Liability;
  onSubmit: (liability: Omit<Liability, 'id'>) => void;
  onCancel: () => void;
}

const LiabilityForm: React.FC<LiabilityFormProps> = ({ liability, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'home_loan' as Liability['type'],
    principalAmount: 0,
    currentBalance: 0,
    interestRate: 0,
    emiAmount: 0,
    startDate: '',
    endDate: '',
    bankName: '',
    accountNumber: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedEMI, setCalculatedEMI] = useState(0);

  useEffect(() => {
    if (liability) {
      setFormData({
        name: liability.name,
        type: liability.type,
        principalAmount: liability.principalAmount,
        currentBalance: liability.currentBalance,
        interestRate: liability.interestRate,
        emiAmount: liability.emiAmount,
        startDate: liability.startDate,
        endDate: liability.endDate,
        bankName: liability.bankName,
        accountNumber: liability.accountNumber || '',
        description: liability.description || '',
      });
    }
  }, [liability]);

  const liabilityTypes = [
    { value: 'home_loan', label: 'Home Loan', icon: '🏠' },
    { value: 'personal_loan', label: 'Personal Loan', icon: '💰' },
    { value: 'car_loan', label: 'Car Loan', icon: '🚗' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳' },
    { value: 'education_loan', label: 'Education Loan', icon: '🎓' },
    { value: 'business_loan', label: 'Business Loan', icon: '🏢' },
    { value: 'other', label: 'Other', icon: '📋' },
  ];

  // Calculate EMI using the standard formula
  const calculateEMI = () => {
    if (!formData.principalAmount || !formData.interestRate || !formData.startDate || !formData.endDate) {
      return 0;
    }

    const principal = formData.principalAmount;
    const monthlyRate = formData.interestRate / 100 / 12;
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const tenureMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (tenureMonths <= 0) return 0;

    // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    
    return Math.ceil(emi);
  };

  useEffect(() => {
    setCalculatedEMI(calculateEMI());
  }, [formData.principalAmount, formData.interestRate, formData.startDate, formData.endDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Liability name is required';
    }

    if (formData.principalAmount <= 0) {
      newErrors.principalAmount = 'Principal amount must be greater than 0';
    }

    if (formData.currentBalance < 0) {
      newErrors.currentBalance = 'Current balance cannot be negative';
    }

    if (formData.currentBalance > formData.principalAmount) {
      newErrors.currentBalance = 'Current balance cannot exceed principal amount';
    }

    if (formData.interestRate <= 0 || formData.interestRate > 50) {
      newErrors.interestRate = 'Interest rate must be between 0.1% and 50%';
    }

    if (formData.emiAmount <= 0) {
      newErrors.emiAmount = 'EMI amount must be greater than 0';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank/Lender name is required';
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
      type: formData.type,
      principalAmount: formData.principalAmount,
      currentBalance: formData.currentBalance,
      interestRate: formData.interestRate,
      emiAmount: formData.emiAmount,
      startDate: formData.startDate,
      endDate: formData.endDate,
      bankName: formData.bankName.trim(),
      accountNumber: formData.accountNumber.trim() || undefined,
      description: formData.description.trim() || undefined,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const useSuggestedEMI = () => {
    setFormData(prev => ({ ...prev, emiAmount: calculatedEMI }));
  };

  const calculateRemainingTenure = () => {
    if (formData.emiAmount <= 0 || formData.currentBalance <= 0 || formData.interestRate <= 0) {
      return 0;
    }

    const monthlyRate = formData.interestRate / 100 / 12;
    const balance = formData.currentBalance;
    const emi = formData.emiAmount;

    // Calculate remaining months using loan balance formula
    const remainingMonths = Math.log(1 + (balance * monthlyRate) / emi) / Math.log(1 + monthlyRate);
    return Math.ceil(remainingMonths);
  };

  const remainingMonths = calculateRemainingTenure();
  const remainingYears = Math.floor(remainingMonths / 12);
  const remainingMonthsOnly = remainingMonths % 12;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">
            Liability Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field ${errors.name ? 'border-red-500 dark:border-red-400' : ''}`}
            placeholder="e.g., Home Loan - HDFC, Car Loan - SBI"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        <div>
          <label className="form-label">
            Liability Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="input-field"
          >
            {liabilityTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Principal Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.principalAmount || ''}
              onChange={(e) => handleChange('principalAmount', Number(e.target.value))}
              className={`input-field pl-8 ${errors.principalAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Original loan amount</p>
          {errors.principalAmount && <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Outstanding Balance *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.currentBalance || ''}
              onChange={(e) => handleChange('currentBalance', Number(e.target.value))}
              className={`input-field pl-8 ${errors.currentBalance ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Amount still owed</p>
          {errors.currentBalance && <p className="text-red-500 text-sm mt-1">{errors.currentBalance}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interest Rate (Annual) *
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.interestRate || ''}
              onChange={(e) => handleChange('interestRate', Number(e.target.value))}
              className={`input-field pr-8 ${errors.interestRate ? 'border-red-500' : ''}`}
              placeholder="8.5"
              min="0.1"
              max="50"
              step="0.1"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
          </div>
          {errors.interestRate && <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly EMI *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.emiAmount || ''}
              onChange={(e) => handleChange('emiAmount', Number(e.target.value))}
              className={`input-field pl-8 ${errors.emiAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="100"
            />
          </div>
          {errors.emiAmount && <p className="text-red-500 text-sm mt-1">{errors.emiAmount}</p>}
          
          {calculatedEMI > 0 && calculatedEMI !== formData.emiAmount && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              <span className="text-blue-700">
                Calculated EMI: {formatCurrency(calculatedEMI)}
              </span>
              <button
                type="button"
                onClick={useSuggestedEMI}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                Use this
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loan Start Date *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className={`input-field ${errors.startDate ? 'border-red-500' : ''}`}
          />
          {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loan End Date *
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className={`input-field ${errors.endDate ? 'border-red-500' : ''}`}
            min={formData.startDate}
          />
          {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank/Lender Name *
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleChange('bankName', e.target.value)}
            className={`input-field ${errors.bankName ? 'border-red-500' : ''}`}
            placeholder="e.g., HDFC Bank, SBI, ICICI Bank"
          />
          {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number (Optional)
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            className="input-field"
            placeholder="Loan account number"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Additional notes about this liability..."
          />
        </div>
      </div>

      {/* Liability Summary */}
      {formData.principalAmount > 0 && formData.currentBalance > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Liability Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Principal Paid:</span>
              <p className="font-medium text-green-600">
                {formatCurrency(formData.principalAmount - formData.currentBalance)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Outstanding:</span>
              <p className="font-medium text-red-600">
                {formatCurrency(formData.currentBalance)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Progress:</span>
              <p className="font-medium text-blue-600">
                {((formData.principalAmount - formData.currentBalance) / formData.principalAmount * 100).toFixed(1)}%
              </p>
            </div>
            {remainingMonths > 0 && (
              <div>
                <span className="text-gray-600">Remaining Tenure:</span>
                <p className="font-medium text-gray-900">
                  {remainingYears > 0 && `${remainingYears}y `}
                  {remainingMonthsOnly}m
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Paid</span>
              <span>Outstanding</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((formData.principalAmount - formData.currentBalance) / formData.principalAmount * 100)}%` 
                }}
              ></div>
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
          {liability ? 'Update Liability' : 'Add Liability'}
        </button>
      </div>
    </form>
  );
};

export default LiabilityForm;