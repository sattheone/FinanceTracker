import React, { useState, useEffect } from 'react';
import { Liability } from '../../types';

interface LiabilityFormProps {
  liability?: Liability;
  onSubmit: (liability: Omit<Liability, 'id'>) => void;
  onCancel: () => void;
}

const LiabilityForm: React.FC<LiabilityFormProps> = ({ liability, onSubmit, onCancel: _onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'home_loan' as Liability['type'],
    principalAmount: 0,
    currentBalance: 0,
    interestRate: 0,
    startDate: '',
    tenureMonths: 0,
    emiAmount: 0,
    endDate: '',
    bankName: '',
    accountNumber: '',
    description: '',
    markPastDuesAsPaid: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());



  useEffect(() => {
    if (liability) {
      // Calculate tenure from start and end date using accurate month difference
      const startDate = new Date(liability.startDate);
      const endDate = new Date(liability.endDate);
      
      // Calculate month difference more accurately
      const yearDiff = endDate.getFullYear() - startDate.getFullYear();
      const monthDiff = endDate.getMonth() - startDate.getMonth();
      const monthsDiff = yearDiff * 12 + monthDiff;

      setFormData({
        name: liability.name,
        type: liability.type,
        principalAmount: liability.principalAmount,
        currentBalance: liability.currentBalance,
        interestRate: liability.interestRate,
        startDate: liability.startDate,
        tenureMonths: monthsDiff,
        emiAmount: liability.emiAmount,
        endDate: liability.endDate,
        bankName: liability.bankName || '',
        accountNumber: liability.accountNumber || '',
        description: liability.description || '',
        markPastDuesAsPaid: false,
      });
      
      // Reset manual edit flags when loading existing liability
      setManuallyEditedFields(new Set());
    } else {
      // Reset form for new liability
      setFormData({
        name: '',
        type: 'home_loan',
        principalAmount: 0,
        currentBalance: 0,
        interestRate: 0,
        startDate: '',
        tenureMonths: 0,
        emiAmount: 0,
        endDate: '',
        bankName: '',
        accountNumber: '',
        description: '',
        markPastDuesAsPaid: false,
      });
    }
  }, [liability]);

  // Calculate EMI using the standard formula
  const calculateEMI = () => {
    if (!formData.principalAmount || !formData.tenureMonths || formData.tenureMonths <= 0) {
      return 0;
    }

    const principal = formData.principalAmount;
    const tenureMonths = formData.tenureMonths;

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

  // Calculate end date from start date + tenure
  const calculateEndDate = () => {
    if (!formData.startDate || !formData.tenureMonths || formData.tenureMonths <= 0) {
      return '';
    }

    const startDate = new Date(formData.startDate);
    if (isNaN(startDate.getTime())) {
      return '';
    }
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + formData.tenureMonths);
    
    if (isNaN(endDate.getTime())) {
      return '';
    }
    
    // Format date properly to avoid invalid date strings
    const year = endDate.getFullYear();
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const day = String(endDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Auto-fill EMI when inputs change (only if not manually edited)
  useEffect(() => {
    if (!manuallyEditedFields.has('emiAmount')) {
      const calculatedEMI = calculateEMI();
      if (calculatedEMI > 0) {
        setFormData(prev => ({ ...prev, emiAmount: calculatedEMI }));
      } else if (formData.emiAmount > 0 && calculatedEMI === 0) {
        // Clear EMI if inputs are cleared
        setFormData(prev => ({ ...prev, emiAmount: 0 }));
      }
    }
  }, [formData.principalAmount, formData.interestRate, formData.tenureMonths, manuallyEditedFields]);

  // Auto-update end date when start date or tenure changes
  useEffect(() => {
    const calculatedEndDate = calculateEndDate();
    if (calculatedEndDate) {
      setFormData(prev => ({ ...prev, endDate: calculatedEndDate }));
    } else if (formData.endDate && !calculatedEndDate) {
      // Clear end date if start date or tenure is cleared
      setFormData(prev => ({ ...prev, endDate: '' }));
    }
  }, [formData.startDate, formData.tenureMonths]);

  // When tenure changes by user, clear the manual EMI flag so it recalculates
  const handleTenureChange = (newTenure: number) => {
    setManuallyEditedFields(prev => {
      const updated = new Set(prev);
      updated.delete('emiAmount'); // Allow EMI to recalculate
      return updated;
    });
    setFormData(prev => ({ ...prev, tenureMonths: newTenure }));
  };

  // When EMI is manually changed, just update the value without recalculating tenure
  const handleEMIChange = (newEMI: number) => {
    setManuallyEditedFields(prev => new Set(prev).add('emiAmount'));
    setFormData(prev => ({ ...prev, emiAmount: newEMI }));
  };

  // Auto-fill current balance only when checkbox is used
  useEffect(() => {
    if (formData.markPastDuesAsPaid && formData.principalAmount > 0) {
      setFormData(prev => ({ ...prev, currentBalance: formData.principalAmount }));
    }
  }, [formData.markPastDuesAsPaid, formData.principalAmount]);

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

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.tenureMonths <= 0) {
      newErrors.tenureMonths = 'Tenure must be greater than 0';
    }

    if (formData.emiAmount <= 0) {
      newErrors.emiAmount = 'EMI amount must be greater than 0';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
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
      bankName: formData.bankName.trim() || 'Not specified',
      accountNumber: formData.accountNumber.trim() || undefined,
      description: formData.description.trim() || undefined,
      markPastDuesAsPaid: formData.markPastDuesAsPaid,
    } as any);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const remainingYears = Math.floor(formData.tenureMonths / 12);
  const remainingMonthsOnly = formData.tenureMonths % 12;

  return (
    <form id="liability-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="form-label">
            Liability Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`input-field theme-input ${errors.name ? 'border-red-500 dark:border-red-400' : ''}`}
            placeholder="e.g., Home Loan, Car Loan, Personal Loan"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        {/* Principal Amount */}
        <div>
          <label className="form-label">
            Total Amount (Principal) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10">₹</span>
            <input
              type="number"
              value={formData.principalAmount || ''}
              onChange={(e) => handleChange('principalAmount', Number(e.target.value))}
              className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${errors.principalAmount ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-500'}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original loan amount</p>
          {errors.principalAmount && <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>}
        </div>

        {/* Interest Rate */}
        <div>
          <label className="form-label">
            Interest Rate (Annual) *
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.interestRate ?? ''}
              onChange={(e) => handleChange('interestRate', e.target.value === '' ? '' : Number(e.target.value))}
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

        {/* Start Date */}
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

        {/* Tenure */}
        <div>
          <label className="form-label">
            Tenure (Months) *
          </label>
          <input
            type="number"
            value={formData.tenureMonths || ''}
            onChange={(e) => handleTenureChange(Number(e.target.value))}
            className={`input-field theme-input ${errors.tenureMonths ? 'border-red-500' : ''}`}
            placeholder="0"
            min="1"
            step="1"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total loan duration in months
            {formData.tenureMonths > 0 && (
              <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                ({remainingYears > 0 && `${remainingYears} ${remainingYears === 1 ? 'year' : 'years'} `}
                {remainingMonthsOnly > 0 && `${remainingMonthsOnly} ${remainingMonthsOnly === 1 ? 'month' : 'months'}`})
                {remainingMonthsOnly > 0 && `${remainingMonthsOnly} ${remainingMonthsOnly === 1 ? 'month' : 'months'}`})
              </span>
            )}
          </p>
          {errors.tenureMonths && <p className="text-red-500 text-sm mt-1">{errors.tenureMonths}</p>}
        </div>

        {/* End Date */}
        <div>
          <label className="form-label">
            Loan End Date
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className={`input-field theme-input ${errors.endDate ? 'border-red-500' : ''}`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-calculated from start date + tenure</p>
          {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
        </div>

        {/* Monthly EMI */}
        <div>
          <label className="form-label">
            Monthly EMI
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10">₹</span>
            <input
              type="number"
              value={formData.emiAmount || ''}
              onChange={(e) => handleEMIChange(Number(e.target.value))}
              className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${errors.emiAmount ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-500'}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-calculated from principal, interest rate, and tenure</p>
          {errors.emiAmount && <p className="text-red-500 text-sm mt-1">{errors.emiAmount}</p>}
        </div>

        {/* Bank Name */}
        <div>
          <label className="form-label">
            Bank/Lender Name (Optional)
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleChange('bankName', e.target.value)}
            className="input-field theme-input"
            placeholder="e.g., HDFC Bank, SBI, ICICI Bank"
          />
        </div>

        {/* Account Number */}
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

        {/* Description */}
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

        {/* Mark Past Dues as Paid */}
        <div className="md:col-span-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.markPastDuesAsPaid}
              onChange={(e) => handleChange('markPastDuesAsPaid', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Mark past dues as paid
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Automatically mark all installments before today as paid. This will calculate the remaining balance based on paid installments.
              </p>
            </div>
          </label>
        </div>
      </div>
    </form>
  );
};

export default LiabilityForm;