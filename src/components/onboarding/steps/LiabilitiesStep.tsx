import React, { useState } from 'react';
import { CreditCard, Plus, Edit3, Trash2 } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { formatCurrency, formatLargeNumber } from '../../../utils/formatters';
import Modal from '../../common/Modal';
import LiabilityForm from '../../forms/LiabilityForm';
import { Liability } from '../../../types';

const LiabilitiesStep: React.FC = () => {
  const { liabilities, addLiability, updateLiability, deleteLiability } = useData();
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

  const getLiabilityIcon = (type: string) => {
    switch (type) {
      case 'home_loan': return '🏠';
      case 'personal_loan': return '💰';
      case 'car_loan': return '🚗';
      case 'credit_card': return '💳';
      case 'education_loan': return '🎓';
      case 'business_loan': return '🏢';
      default: return '📋';
    }
  };

  const handleAddLiability = () => {
    setEditingLiability(null);
    setShowLiabilityForm(true);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingLiability(liability);
    setShowLiabilityForm(true);
  };

  const handleDeleteLiability = (liabilityId: string) => {
    if (window.confirm('Are you sure you want to delete this liability?')) {
      deleteLiability(liabilityId);
    }
  };

  const handleLiabilitySubmit = (liabilityData: Omit<Liability, 'id'>) => {
    if (editingLiability) {
      updateLiability(editingLiability.id, liabilityData);
    } else {
      addLiability(liabilityData);
    }
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  const handleLiabilityCancel = () => {
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  const totalOutstanding = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const totalEMI = liabilities.reduce((sum, liability) => sum + liability.emiAmount, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Liabilities</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Add your loans, EMIs, and debt obligations to get a complete picture of your financial health.
        </p>
      </div>

      {/* Summary Cards */}
      {liabilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Total Outstanding</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatLargeNumber(totalOutstanding)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">₹</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Monthly EMI</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalEMI)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Liability Button */}
      <div className="text-center">
        <button
          onClick={handleAddLiability}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Liability
        </button>
      </div>

      {/* Liabilities List */}
      {liabilities.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Liabilities</h3>
          <div className="space-y-3">
            {liabilities.map((liability) => {
              const progress = liability.principalAmount > 0 
                ? ((liability.principalAmount - liability.currentBalance) / liability.principalAmount) * 100 
                : 0;
              
              return (
                <div key={liability.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className="text-2xl mr-3">{getLiabilityIcon(liability.type)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{liability.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                          <span className="capitalize">{liability.type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{liability.bankName}</span>
                          <span>•</span>
                          <span>{liability.interestRate}% interest</span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Outstanding:</span>
                            <p className="font-medium text-red-600 dark:text-red-400">
                              {formatLargeNumber(liability.currentBalance)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Monthly EMI:</span>
                            <p className="font-medium text-blue-600 dark:text-blue-400">
                              {formatCurrency(liability.emiAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {progress.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditLiability(liability)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit Liability"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLiability(liability.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Liability"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}





      {/* Liability Form Modal */}
      <Modal
        isOpen={showLiabilityForm}
        onClose={handleLiabilityCancel}
        title={editingLiability ? 'Edit Liability' : 'Add New Liability'}
        size="xl"
      >
        <LiabilityForm
          liability={editingLiability || undefined}
          onSubmit={handleLiabilitySubmit}
          onCancel={handleLiabilityCancel}
        />
      </Modal>
    </div>
  );
};

export default LiabilitiesStep;