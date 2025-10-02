import React, { useState } from 'react';
import { Shield, Heart, User, Calendar, Plus, Edit3, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, formatLargeNumber } from '../utils/formatters';
import Modal from '../components/common/Modal';
import InsuranceForm from '../components/forms/InsuranceForm';
import type { Insurance } from '../types';

const Insurance: React.FC = () => {
  const { insurance, licPolicies, addInsurance, updateInsurance, deleteInsurance } = useData();
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const totalCover = insurance.reduce((sum, policy) => sum + policy.coverAmount, 0);
  const totalPremiums = insurance.reduce((sum, policy) => sum + policy.premiumAmount, 0);
  const totalLICMaturity = licPolicies.reduce((sum, policy) => sum + policy.maturityAmount, 0);

  const getInsuranceIcon = (type: string) => {
    switch (type) {
      case 'term': return '🛡️';
      case 'endowment': return '💰';
      case 'health': return '🏥';
      default: return '📋';
    }
  };

  const getInsuranceColor = (type: string) => {
    switch (type) {
      case 'term': return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
      case 'endowment': return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
      case 'health': return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
      default: return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const licByYear = licPolicies.reduce((acc, policy) => {
    if (!acc[policy.maturityYear]) {
      acc[policy.maturityYear] = [];
    }
    acc[policy.maturityYear].push(policy);
    return acc;
  }, {} as Record<number, typeof licPolicies>);

  const sortedYears = Object.keys(licByYear).map(Number).sort();

  // Handler functions
  const handleAddInsurance = () => {
    setEditingInsurance(null);
    setShowInsuranceForm(true);
  };

  const handleEditInsurance = (insurancePolicy: Insurance) => {
    setEditingInsurance(insurancePolicy);
    setShowInsuranceForm(true);
  };

  const handleDeleteInsurance = (insuranceId: string) => {
    if (window.confirm('Are you sure you want to delete this insurance policy?')) {
      deleteInsurance(insuranceId);
    }
  };

  const handleInsuranceSubmit = (insuranceData: Omit<Insurance, 'id'>) => {
    if (editingInsurance) {
      updateInsurance(editingInsurance.id, insuranceData);
    } else {
      addInsurance(insuranceData);
    }
    setShowInsuranceForm(false);
    setEditingInsurance(null);
  };

  const handleInsuranceCancel = () => {
    setShowInsuranceForm(false);
    setEditingInsurance(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Insurance Portfolio</h1>
        <p className="text-gray-600 mt-1">Comprehensive protection and policy management</p>
      </div>

      {/* Insurance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card text-center">
          <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Total Cover</p>
          <p className="text-2xl font-bold text-gray-900">{formatLargeNumber(totalCover)}</p>
        </div>
        <div className="metric-card text-center">
          <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Annual Premiums</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPremiums)}</p>
        </div>
        <div className="metric-card text-center">
          <User className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Active Policies</p>
          <p className="text-2xl font-bold text-gray-900">{insurance.length + licPolicies.length}</p>
        </div>
        <div className="metric-card text-center">
          <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">LIC Maturity Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatLargeNumber(totalLICMaturity)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Active Insurance Policies</h3>
        <button
          onClick={handleAddInsurance}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Policy
        </button>
      </div>

      {/* Active Insurance Policies */}
      <div className="card">
        <div className="space-y-4">
          {insurance.map((policy) => (
            <div key={policy.id} className={`p-4 border-l-4 rounded-lg ${getInsuranceColor(policy.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{getInsuranceIcon(policy.type)}</span>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{policy.policyName}</h4>
                      <p className="text-sm text-gray-600 capitalize">{policy.type} Insurance</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Cover Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatLargeNumber(policy.coverAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Premium</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(policy.premiumAmount)}
                      </p>
                      <p className="text-xs text-gray-500">{policy.premiumFrequency}</p>
                    </div>
                    {policy.maturityDate && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Maturity Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatDate(policy.maturityDate)}
                        </p>
                      </div>
                    )}
                    {policy.maturityAmount && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Maturity Amount</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatLargeNumber(policy.maturityAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditInsurance(policy)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Policy"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteInsurance(policy.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIC Policies Maturity Schedule */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          LIC Policies Maturity Schedule (25 Policies)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Post-retirement income stream from {licPolicies.length} LIC policies maturing between 2036-2060
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Policies Maturing
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Maturity Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age at Maturity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {sortedYears.map((year) => {
                const yearPolicies = licByYear[year];
                const yearTotal = yearPolicies.reduce((sum, p) => sum + p.maturityAmount, 0);
                const ageAtMaturity = 40 + (year - 2025); // Current age is 40 in 2025
                
                return (
                  <tr key={year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {yearPolicies.length} {yearPolicies.length === 1 ? 'policy' : 'policies'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      {formatCurrency(yearTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {ageAtMaturity} years
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {licPolicies.length} policies
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                  {formatLargeNumber(totalLICMaturity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                  25 years
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Insurance Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Life Insurance Coverage</p>
                <p className="text-sm text-gray-600">Term + Endowment policies</p>
              </div>
              <p className="text-lg font-bold text-blue-600">
                {formatLargeNumber(
                  insurance
                    .filter(p => ['term', 'endowment'].includes(p.type))
                    .reduce((sum, p) => sum + p.coverAmount, 0)
                )}
              </p>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Health Insurance Coverage</p>
                <p className="text-sm text-gray-600">Family floater policy</p>
              </div>
              <p className="text-lg font-bold text-red-600">
                {formatLargeNumber(
                  insurance
                    .filter(p => p.type === 'health')
                    .reduce((sum, p) => sum + p.coverAmount, 0)
                )}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Coverage to Income Ratio</span>
                <span className="text-lg font-bold text-green-600">
                  {(totalCover / (223857 * 12)).toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 10-15x annual income
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Premium Efficiency</h3>
          <div className="space-y-4">
            {insurance.map((policy) => {
              const efficiency = (policy.coverAmount / policy.premiumAmount).toFixed(0);
              return (
                <div key={policy.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{policy.policyName}</p>
                    <p className="text-sm text-gray-600">Cover per ₹1 premium</p>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    ₹{efficiency}
                  </p>
                </div>
              );
            })}
            
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Annual Premium</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(totalPremiums)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((totalPremiums / (223857 * 12)) * 100).toFixed(1)}% of annual income
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insurance Form Modal */}
      <Modal
        isOpen={showInsuranceForm}
        onClose={handleInsuranceCancel}
        title={editingInsurance ? 'Edit Insurance Policy' : 'Add New Insurance Policy'}
        size="lg"
      >
        <InsuranceForm
          insurance={editingInsurance || undefined}
          onSubmit={handleInsuranceSubmit}
          onCancel={handleInsuranceCancel}
        />
      </Modal>
    </div>
  );
};

export default Insurance;