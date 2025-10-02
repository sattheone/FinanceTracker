import React, { useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { Insurance } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

const InsuranceStep: React.FC = () => {
  const { insurance, addInsurance, deleteInsurance } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInsurance, setNewInsurance] = useState({
    type: 'term' as Insurance['type'],
    policyName: '',
    coverAmount: 0,
    premiumAmount: 0,
    premiumFrequency: 'yearly' as Insurance['premiumFrequency'],
    maturityDate: '',
    maturityAmount: 0,
  });

  const insuranceTypes = [
    { value: 'term', label: 'Term Life Insurance', icon: '🛡️' },
    { value: 'endowment', label: 'Endowment Policy', icon: '💰' },
    { value: 'health', label: 'Health Insurance', icon: '🏥' },
    { value: 'other', label: 'Other Insurance', icon: '📋' },
  ];

  const handleAddInsurance = () => {
    if (newInsurance.policyName && newInsurance.coverAmount > 0 && newInsurance.premiumAmount > 0) {
      addInsurance(newInsurance);
      setNewInsurance({
        type: 'term',
        policyName: '',
        coverAmount: 0,
        premiumAmount: 0,
        premiumFrequency: 'yearly',
        maturityDate: '',
        maturityAmount: 0,
      });
      setShowAddForm(false);
    }
  };

  const totalCover = insurance.reduce((sum, policy) => sum + policy.coverAmount, 0);
  const totalPremiums = insurance.reduce((sum, policy) => {
    const multiplier = policy.premiumFrequency === 'monthly' ? 12 : 
                     policy.premiumFrequency === 'quarterly' ? 4 : 1;
    return sum + (policy.premiumAmount * multiplier);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insurance Policies</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Add your insurance policies to ensure adequate protection for you and your family.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Coverage</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(totalCover)}
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Annual Premiums</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatCurrency(totalPremiums)}
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Policies</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {insurance.length}
          </p>
        </div>
      </div>

      {/* Add Insurance Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Insurance Policies</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Policy
        </button>
      </div>

      {/* Add Insurance Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-500">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Insurance Policy</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Policy Name
              </label>
              <input
                type="text"
                value={newInsurance.policyName}
                onChange={(e) => setNewInsurance({ ...newInsurance, policyName: e.target.value })}
                className="input-field"
                placeholder="e.g., HDFC Life Term Plan, Star Health Policy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Insurance Type
              </label>
              <select
                value={newInsurance.type}
                onChange={(e) => setNewInsurance({ ...newInsurance, type: e.target.value as Insurance['type'] })}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Coverage Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={newInsurance.coverAmount || ''}
                  onChange={(e) => setNewInsurance({ ...newInsurance, coverAmount: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Premium Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={newInsurance.premiumAmount || ''}
                  onChange={(e) => setNewInsurance({ ...newInsurance, premiumAmount: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Premium Frequency
              </label>
              <select
                value={newInsurance.premiumFrequency}
                onChange={(e) => setNewInsurance({ ...newInsurance, premiumFrequency: e.target.value as Insurance['premiumFrequency'] })}
                className="input-field"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {(newInsurance.type === 'endowment' || newInsurance.type === 'other') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Maturity Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newInsurance.maturityDate}
                    onChange={(e) => setNewInsurance({ ...newInsurance, maturityDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Maturity Amount (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                    <input
                      type="number"
                      value={newInsurance.maturityAmount || ''}
                      onChange={(e) => setNewInsurance({ ...newInsurance, maturityAmount: Number(e.target.value) })}
                      className="input-field pl-8"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddInsurance} className="btn-primary">
              Add Policy
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Insurance List */}
      <div className="space-y-4">
        {insurance.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No insurance policies added</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Protect yourself and your family by adding your insurance policies.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Add Your First Policy
            </button>
          </div>
        ) : (
          insurance.map((policy) => {
            const insuranceType = insuranceTypes.find(type => type.value === policy.type);
            const annualPremium = policy.premiumFrequency === 'monthly' ? policy.premiumAmount * 12 :
                                 policy.premiumFrequency === 'quarterly' ? policy.premiumAmount * 4 :
                                 policy.premiumAmount;
            
            return (
              <div key={policy.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{insuranceType?.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{policy.policyName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{insuranceType?.label}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Coverage</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(policy.coverAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Premium</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(policy.premiumAmount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{policy.premiumFrequency}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Annual Premium</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(annualPremium)}
                        </p>
                      </div>
                      {policy.maturityDate && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">Maturity</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {new Date(policy.maturityDate).toLocaleDateString()}
                          </p>
                          {policy.maturityAmount && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {formatCurrency(policy.maturityAmount)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteInsurance(policy.id)}
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 p-2 rounded-lg ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Insurance Recommendations */}
      {insurance.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-medium text-blue-900 mb-3">💡 Insurance Recommendations</h4>
          <div className="text-sm text-blue-700 space-y-2">
            {!insurance.some(p => p.type === 'term') && (
              <p>• Consider adding term life insurance for comprehensive life coverage</p>
            )}
            {!insurance.some(p => p.type === 'health') && (
              <p>• Health insurance is essential for medical emergencies</p>
            )}
            {totalCover > 0 && (
              <p>• Your total life coverage is {formatCurrency(totalCover)} - ensure it's adequate for your family's needs</p>
            )}
            <p>• Review your policies annually and update coverage as your income grows</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceStep;