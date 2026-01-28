import React, { useState, useEffect } from 'react';
import { Shield, Heart, User, Calendar, Plus, Edit3, Trash2, Copy } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, formatLargeNumber } from '../utils/formatters';
import SidePanel from '../components/common/SidePanel';
import InsuranceForm from '../components/forms/InsuranceForm';
import type { Insurance } from '../types';

const Insurance: React.FC = () => {
  const { insurance, addInsurance, updateInsurance, deleteInsurance, loadInsurance } = useData();
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);

  // Lazy load insurance data when page mounts
  useEffect(() => {
    loadInsurance();
  }, []);

  const totalCover = insurance.reduce((sum, policy) => sum + policy.coverAmount, 0);

  // Calculate total annual premiums by normalizing all frequencies to yearly
  // Only include policies where premium paying term is not yet over
  const totalPremiums = insurance.reduce((sum, policy) => {
    // Check if premium paying term is over
    if (policy.policyStartDate && policy.premiumPayingTerm) {
      const startDate = new Date(policy.policyStartDate);
      const premiumEndDate = new Date(startDate);
      premiumEndDate.setFullYear(startDate.getFullYear() + policy.premiumPayingTerm);

      const today = new Date();
      // If premium paying term is over, don't include this policy
      if (today > premiumEndDate) {
        return sum;
      }
    }

    // Calculate annual premium based on frequency
    let annualPremium = policy.premiumAmount;
    if (policy.premiumFrequency === 'monthly') {
      annualPremium = policy.premiumAmount * 12;
    } else if (policy.premiumFrequency === 'quarterly') {
      annualPremium = policy.premiumAmount * 4;
    }
    // If yearly, use as-is
    return sum + annualPremium;
  }, 0);

  const licPolicies = insurance
    .filter(p => (p.type === 'endowment' || p.type === 'other') && p.maturityAmount)
    .map(p => ({
      ...p,
      maturityYear: p.maturityDate ? new Date(p.maturityDate).getFullYear() : 0,
    }));

  const totalLICMaturity = licPolicies.reduce((sum, policy) => sum + (policy.maturityAmount || 0), 0);

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

  const calculatePayoutYear = (policy: Insurance) => {
    if (policy.usePremiumPayingTermForMaturity && policy.policyStartDate && policy.premiumPayingTerm) {
      const policyStart = new Date(policy.policyStartDate);
      const premiumEndDate = new Date(policyStart.getFullYear() + policy.premiumPayingTerm, policyStart.getMonth(), policyStart.getDate());
      const payoutYear = premiumEndDate.getFullYear() + 1;
      return payoutYear;
    }
    return null;
  };

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

  const handleDuplicateInsurance = (policy: Insurance) => {
    const { id, ...policyData } = policy;
    addInsurance({
      ...policyData,
      policyName: `${policyData.policyName} (Copy)`,
    });
  };

  const handleInsuranceSubmit = (insuranceData: Omit<Insurance, 'id'>) => {
    console.log('Submitting insurance data:', insuranceData);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Insurance Portfolio</h1>
        <p className="text-gray-600 dark:text-gray-300 dark:text-gray-400 mt-1">Comprehensive protection and policy management</p>
      </div>

      {/* Insurance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card text-center">
          <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Sum Assured</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{formatLargeNumber(totalCover)}</p>
        </div>
        <div className="metric-card text-center">
          <Calendar className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Annual Premiums</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{formatCurrency(totalPremiums)}</p>
        </div>
        <div className="metric-card text-center">
          <User className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Policies</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insurance.length}</p>
        </div>
        <div className="metric-card text-center">
          <Heart className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">LIC Maturity Value</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatLargeNumber(totalLICMaturity)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Insurance Policies</h3>
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
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{policy.policyName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">{policy.type} Insurance</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sum Assured</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatLargeNumber(policy.coverAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Premium</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(policy.premiumAmount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{policy.premiumFrequency}</p>
                    </div>
                    {policy.maturityDate && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Maturity Date</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatDate(policy.maturityDate)}
                        </p>
                      </div>
                    )}
                    {policy.usePremiumPayingTermForMaturity && calculatePayoutYear(policy) && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payout Year</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {calculatePayoutYear(policy)}
                        </p>
                      </div>
                    )}
                    {policy.maturityAmount && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Maturity Amount</p>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {formatLargeNumber(policy.maturityAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleDuplicateInsurance(policy)}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors"
                    title="Duplicate Policy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditInsurance(policy)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                    title="Edit Policy"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteInsurance(policy.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
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





      {/* Insurance Form SidePanel */}
      <SidePanel
        isOpen={showInsuranceForm}
        onClose={handleInsuranceCancel}
        title={editingInsurance ? 'Edit Insurance Policy' : 'Add New Insurance Policy'}
        size="lg"
        footer={
          <div className="flex justify-end w-full space-x-2">
            <button
              onClick={handleInsuranceCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="insurance-form" // Assumes InsuranceForm has a form with id="insurance-form"
              className="btn-primary"
            >
              {editingInsurance ? 'Update Policy' : 'Add Policy'}
            </button>
          </div>
        }
      >
        <InsuranceForm
          insurance={editingInsurance || undefined}
          onSubmit={handleInsuranceSubmit}
          onCancel={handleInsuranceCancel}
        />
      </SidePanel>
    </div>
  );
};

export default Insurance;