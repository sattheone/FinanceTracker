import React, { useState, useEffect } from 'react';
import { Insurance } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface InsuranceFormProps {
  insurance?: Insurance;
  onSubmit: (insurance: Omit<Insurance, 'id'>) => void;
  onCancel: () => void;
}

const InsuranceForm: React.FC<InsuranceFormProps> = ({ insurance, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'term' as Insurance['type'],
    policyName: '',
    coverAmount: 0,
    premiumAmount: 0,
    premiumFrequency: 'yearly' as Insurance['premiumFrequency'],
    maturityDate: '',
    maturityAmount: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (insurance) {
      setFormData({
        type: insurance.type,
        policyName: insurance.policyName,
        coverAmount: insurance.coverAmount,
        premiumAmount: insurance.premiumAmount,
        premiumFrequency: insurance.premiumFrequency,
        maturityDate: insurance.maturityDate || '',
        maturityAmount: insurance.maturityAmount || 0,
      });
    }
  }, [insurance]);

  const insuranceTypes = [
    { value: 'term', label: 'Term Life Insurance', icon: '🛡️' },
    { value: 'endowment', label: 'Endowment Policy', icon: '💰' },
    { value: 'health', label: 'Health Insurance', icon: '🏥' },
    { value: 'other', label: 'Other Insurance', icon: '📋' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.policyName.trim()) {
      newErrors.policyName = 'Policy name is required';
    }

    if (formData.coverAmount <= 0) {
      newErrors.coverAmount = 'Cover amount must be greater than 0';
    }

    if (formData.premiumAmount <= 0) {
      newErrors.premiumAmount = 'Premium amount must be greater than 0';
    }

    if (formData.maturityDate) {
      const maturityDate = new Date(formData.maturityDate);
      const today = new Date();
      if (maturityDate <= today) {
        newErrors.maturityDate = 'Maturity date must be in the future';
      }
    }

    if (formData.maturityAmount < 0) {
      newErrors.maturityAmount = 'Maturity amount cannot be negative';
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
      type: formData.type,
      policyName: formData.policyName.trim(),
      coverAmount: formData.coverAmount,
      premiumAmount: formData.premiumAmount,
      premiumFrequency: formData.premiumFrequency,
      maturityDate: formData.maturityDate || undefined,
      maturityAmount: formData.maturityAmount || undefined,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getAnnualPremium = () => {
    const multiplier = formData.premiumFrequency === 'monthly' ? 12 : 
                     formData.premiumFrequency === 'quarterly' ? 4 : 1;
    return formData.premiumAmount * multiplier;
  };

  const getCoverageRatio = () => {
    if (formData.premiumAmount <= 0) return 0;
    return Math.round(formData.coverAmount / getAnnualPremium());
  };

  const showMaturityFields = formData.type === 'endowment' || formData.type === 'other';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Policy Name *
          </label>
          <input
            type="text"
            value={formData.policyName}
            onChange={(e) => handleChange('policyName', e.target.value)}
            className={`input-field ${errors.policyName ? 'border-red-500' : ''}`}
            placeholder="e.g., HDFC Life Term Plan, Star Health Policy"
          />
          {errors.policyName && <p className="text-red-500 text-sm mt-1">{errors.policyName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insurance Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="input-field"
          >
            {insuranceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coverage Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.coverAmount || ''}
              onChange={(e) => handleChange('coverAmount', Number(e.target.value))}
              className={`input-field pl-8 ${errors.coverAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="10000"
            />
          </div>
          {errors.coverAmount && <p className="text-red-500 text-sm mt-1">{errors.coverAmount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Premium Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.premiumAmount || ''}
              onChange={(e) => handleChange('premiumAmount', Number(e.target.value))}
              className={`input-field pl-8 ${errors.premiumAmount ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="100"
            />
          </div>
          {errors.premiumAmount && <p className="text-red-500 text-sm mt-1">{errors.premiumAmount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Premium Frequency *
          </label>
          <select
            value={formData.premiumFrequency}
            onChange={(e) => handleChange('premiumFrequency', e.target.value)}
            className="input-field"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {showMaturityFields && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maturity Date (Optional)
              </label>
              <input
                type="date"
                value={formData.maturityDate}
                onChange={(e) => handleChange('maturityDate', e.target.value)}
                className={`input-field ${errors.maturityDate ? 'border-red-500' : ''}`}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.maturityDate && <p className="text-red-500 text-sm mt-1">{errors.maturityDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maturity Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={formData.maturityAmount || ''}
                  onChange={(e) => handleChange('maturityAmount', Number(e.target.value))}
                  className={`input-field pl-8 ${errors.maturityAmount ? 'border-red-500' : ''}`}
                  placeholder="0"
                  min="0"
                  step="1000"
                />
              </div>
              {errors.maturityAmount && <p className="text-red-500 text-sm mt-1">{errors.maturityAmount}</p>}
            </div>
          </>
        )}
      </div>

      {/* Calculated Fields */}
      {formData.premiumAmount > 0 && formData.coverAmount > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Policy Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Annual Premium:</span>
              <div className="font-medium text-gray-900">
                {formatCurrency(getAnnualPremium())}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Coverage Ratio:</span>
              <div className="font-medium text-gray-900">
                ₹{getCoverageRatio()} per ₹1 premium
              </div>
            </div>
            <div>
              <span className="text-gray-600">Premium % of Cover:</span>
              <div className="font-medium text-gray-900">
                {((getAnnualPremium() / formData.coverAmount) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {formData.maturityAmount > 0 && formData.maturityDate && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Maturity Value:</span>
                  <div className="font-medium text-green-600">
                    {formatCurrency(formData.maturityAmount)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Years to Maturity:</span>
                  <div className="font-medium text-gray-900">
                    {Math.ceil((new Date(formData.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365))} years
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Insurance Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {formData.type === 'term' && (
            <>
              <li>• Term insurance should be 10-15x your annual income</li>
              <li>• Choose a term that covers your dependents until they become financially independent</li>
            </>
          )}
          {formData.type === 'health' && (
            <>
              <li>• Health cover should be at least ₹5-10 lakhs for a family</li>
              <li>• Consider increasing coverage with age and medical inflation</li>
            </>
          )}
          {formData.type === 'endowment' && (
            <li>• Endowment policies offer lower returns compared to term + investment</li>
          )}
          <li>• Review and update your coverage annually</li>
        </ul>
      </div>

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
          {insurance ? 'Update Policy' : 'Add Policy'}
        </button>
      </div>
    </form>
  );
};

export default InsuranceForm;