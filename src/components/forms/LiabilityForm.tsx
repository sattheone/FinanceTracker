import React, { useState, useEffect } from 'react';
import { Liability } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateAmortizationDetails } from '../../utils/loanCalculations';

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
    numberOfDues: 0,
    startDate: '',
    endDate: '',
    bankName: '',
    accountNumber: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedEMI, setCalculatedEMI] = useState(0);

  const handleAutoCalculateBalance = () => {
    if (!formData.principalAmount || !formData.startDate || !formData.emiAmount) {
      return;
    }

    const details = calculateAmortizationDetails(
      formData.principalAmount,
      formData.interestRate,
      formData.emiAmount,
      formData.startDate
    );

    setFormData(prev => ({ ...prev, currentBalance: Math.round(details.projectedBalance) }));
  };

  useEffect(() => {
    if (liability) {
      // Calculate number of dues from start and end date
      const startDate = new Date(liability.startDate);
      const endDate = new Date(liability.endDate);
      const monthsDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      setFormData({
        name: liability.name,
        type: liability.type,
        principalAmount: liability.principalAmount,
        currentBalance: liability.currentBalance,
        interestRate: liability.interestRate,
        emiAmount: liability.emiAmount,
        numberOfDues: monthsDiff,
        startDate: liability.startDate,
        endDate: liability.endDate,
        bankName: liability.bankName,
        accountNumber: liability.accountNumber || '',
        description: liability.description || '',
      });
    } else {
      // Reset form for new liability
      setFormData({
        name: '',
        type: 'home_loan',
        principalAmount: 0,
        currentBalance: 0,
        interestRate: 0,
        emiAmount: 0,
        numberOfDues: 0,
        startDate: '',
        endDate: '',
        bankName: '',
        accountNumber: '',
        description: '',
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
    if (!formData.principalAmount || !formData.startDate || !formData.endDate) {
      return 0;
    }

    const principal = formData.principalAmount;
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const tenureMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (tenureMonths <= 0) return 0;

    // If interest rate is 0, simple division
    if (formData.interestRate === 0) {
      return Math.ceil(principal / tenureMonths);
    }

    const monthlyRate = formData.interestRate / 100 / 12;
    // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    return Math.ceil(emi);
  };

  useEffect(() => {
    setCalculatedEMI(calculateEMI());
  }, [formData.principalAmount, formData.interestRate, formData.startDate, formData.endDate]);

  // Auto-calculate end date when numberOfDues or startDate changes (manual input only)
  const handleNumberOfDuesChange = (value: number) => {
    handleChange('numberOfDues', value);

    if (value > 0 && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + value);
      const calculatedEndDate = endDate.toISOString().split('T')[0];

      setFormData(prev => ({ ...prev, endDate: calculatedEndDate, numberOfDues: value }));
    }
  };

  // Auto-calculate current balance when loan details change
  useEffect(() => {
    // Only auto-calculate if:
    // 1. We have all necessary data
    // 2. The current balance is exactly equal to principal (meaning user hasn't likely updated it yet)
    // 3. The start date is in the past
    if (
      formData.principalAmount > 0 &&
      formData.startDate &&
      formData.emiAmount > 0 &&
      formData.currentBalance === formData.principalAmount
    ) {
      const startDate = new Date(formData.startDate);

      // If start date is at least 1 month in the past
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      if (startDate < oneMonthAgo) {
        const details = calculateAmortizationDetails(
          formData.principalAmount,
          formData.interestRate,
          formData.emiAmount,
          formData.startDate
        );

        // Only update if the calculated balance is different and valid
        if (details.projectedBalance < formData.principalAmount && details.projectedBalance >= 0) {
          console.log('Auto-calculating current balance based on past start date');
          setFormData(prev => ({
            ...prev,
            currentBalance: Math.round(details.projectedBalance)
          }));
        }
      }
    }
  }, [formData.principalAmount, formData.startDate, formData.emiAmount, formData.interestRate]);

  // Auto-calculate numberOfDues when endDate changes (manual input only)
  const handleEndDateChange = (value: string) => {
    handleChange('endDate', value);

    if (formData.startDate && value) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(value);
      const monthsDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      if (monthsDiff > 0) {
        setFormData(prev => ({ ...prev, numberOfDues: monthsDiff, endDate: value }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Liability name is required';
    }

    if (formData.principalAmount <= 0) {
      newErrors.principalAmount = 'Principal amount must be greater than 0';
    }



    if (formData.interestRate < 0 || formData.interestRate > 50) {
      newErrors.interestRate = 'Interest rate must be between 0% and 50%';
    }

    if (formData.emiAmount <= 0) {
      newErrors.emiAmount = 'EMI amount must be greater than 0';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (formData.currentBalance < 0) {
      newErrors.currentBalance = 'Current balance cannot be negative';
    }

    if (formData.currentBalance > formData.principalAmount) {
      newErrors.currentBalance = 'Current balance cannot exceed principal amount';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
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
    if (formData.emiAmount <= 0 || formData.principalAmount <= 0) {
      return 0;
    }

    // If interest rate is 0, simple division
    if (formData.interestRate === 0) {
      return Math.ceil(formData.principalAmount / formData.emiAmount);
    }

    const monthlyRate = formData.interestRate / 100 / 12;
    const balance = formData.principalAmount;
    const emi = formData.emiAmount;

    // Calculate remaining months using loan balance formula
    const remainingMonths = Math.log(1 + (balance * monthlyRate) / emi) / Math.log(1 + monthlyRate);
    return Math.ceil(remainingMonths);
  };

  const remainingMonths = calculateRemainingTenure();
  const remainingYears = Math.floor(remainingMonths / 12);
  const remainingMonthsOnly = remainingMonths % 12;

  return (
    <form id="liability-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">
            Liability Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field theme-input ${errors.name ? 'border-red-500 dark:border-red-400' : ''}`}
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
            className="input-field theme-input"
          >
            {liabilityTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Principal Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.principalAmount || ''}
              onChange={(e) => handleChange('principalAmount', Number(e.target.value))}
              className={`input-field pl-8 theme-input ${errors.principalAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original loan amount</p>
          {errors.principalAmount && <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>}
        </div>

        <div>
          <label className="form-label">
            Current Outstanding Balance *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.currentBalance || ''}
              onChange={(e) => handleChange('currentBalance', Number(e.target.value))}
              className={`input-field pl-8 theme-input ${errors.currentBalance ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current amount you still owe</p>
            {formData.principalAmount > 0 && formData.startDate && formData.emiAmount > 0 && (
              <button
                type="button"
                onClick={handleAutoCalculateBalance}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
              >
                Calculate from Start Date
              </button>
            )}
          </div>
          {errors.currentBalance && <p className="text-red-500 text-sm mt-1">{errors.currentBalance}</p>}
        </div>



        <div>
          <label className="form-label">
            Interest Rate (Annual)
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.interestRate || ''}
              onChange={(e) => handleChange('interestRate', Number(e.target.value))}
              className={`input-field pr-8 theme-input ${errors.interestRate ? 'border-red-500' : ''}`}
              placeholder="8.5"
              min="0"
              max="50"
              step="0.1"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter 0 for interest-free loans</p>
          {errors.interestRate && <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>}
        </div>

        <div>
          <label className="form-label">
            Monthly EMI *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
            <input
              type="number"
              value={formData.emiAmount || ''}
              onChange={(e) => handleChange('emiAmount', Number(e.target.value))}
              className={`input-field pl-8 theme-input ${errors.emiAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          {errors.emiAmount && <p className="text-red-500 text-sm mt-1">{errors.emiAmount}</p>}

          {calculatedEMI > 0 && Math.abs(calculatedEMI - formData.emiAmount) > 1 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
              <span className="text-blue-700 dark:text-blue-300">
                Suggested EMI (based on dates): {formatCurrency(calculatedEMI)}
              </span>
              <button
                type="button"
                onClick={useSuggestedEMI}
                className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
              >
                Use this
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="form-label">
            Loan Start Date *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className={`input-field theme-input ${errors.startDate ? 'border-red-500' : ''}`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">When the loan started</p>
          {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
        </div>

        <div>
          <label className="form-label">
            Number of Dues (Months)
          </label>
          <input
            type="number"
            value={formData.numberOfDues || ''}
            onChange={(e) => handleNumberOfDuesChange(Number(e.target.value))}
            className="input-field theme-input"
            placeholder="0"
            min="0"
            step="1"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total number of monthly installments</p>
        </div>

        <div>
          <label className="form-label">
            Loan End Date *
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className={`input-field theme-input ${errors.endDate ? 'border-red-500' : ''}`}
            min={formData.startDate}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            When the loan will be fully repaid
          </p>
          {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
        </div>

        <div>
          <label className="form-label">
            Bank/Lender Name *
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleChange('bankName', e.target.value)}
            className={`input-field theme-input ${errors.bankName ? 'border-red-500' : ''}`}
            placeholder="e.g., HDFC Bank, SBI, ICICI Bank"
          />
          {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>}
        </div>

        <div>
          <label className="form-label">
            Account Number (Optional)
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            className="input-field theme-input"
            placeholder="Loan account number"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="input-field theme-input"
            rows={3}
            placeholder="Additional notes about this liability..."
          />
        </div>
      </div>

      {/* Liability Summary */}
      {formData.principalAmount > 0 && formData.emiAmount > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Liability Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-300">Principal Amount:</span>
              <p className="font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency(formData.principalAmount)}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Monthly EMI:</span>
              <p className="font-medium text-orange-600 dark:text-orange-400">
                {formatCurrency(formData.emiAmount)}
              </p>
            </div>
            {remainingMonths > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-300">Total Tenure:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {remainingYears > 0 && `${remainingYears}y `}
                  {remainingMonthsOnly}m
                </p>
              </div>
            )}
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
          {liability ? 'Update Liability' : 'Add Liability'}
        </button>
      </div>
    </form>
  );
};

export default LiabilityForm;