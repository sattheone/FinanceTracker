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
        <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-error)' }} />
        <h2 className="text-2xl font-bold theme-text-primary mb-2">Your Liabilities</h2>
        <p className="theme-text-secondary">
          Add your loans, EMIs, and debt obligations to get a complete picture of your financial health.
        </p>
      </div>

      {/* Summary Cards */}
      {liabilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="metric-card">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 mr-3" style={{ color: 'var(--color-error)' }} />
              <div>
                <p className="text-sm font-medium theme-text-secondary">Total Outstanding</p>
                <p className="text-xl font-bold" style={{ color: 'var(--color-error)' }}>{formatLargeNumber(totalOutstanding)}</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-accent-primary)' }}>
                <span style={{ color: 'var(--color-text-inverse)' }} className="text-sm font-bold">₹</span>
              </div>
              <div>
                <p className="text-sm font-medium theme-text-secondary">Monthly EMI</p>
                <p className="text-xl font-bold theme-text-primary">{formatCurrency(totalEMI)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Liability Button */}
      <div className="text-center">
        <button onClick={handleAddLiability} className="btn-primary flex items-center mx-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Liability
        </button>
      </div>

      {/* Liabilities List */}
      {liabilities.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold theme-text-primary">Your Liabilities</h3>
          <div className="space-y-3">
            {liabilities.map((liability) => {
              const progress = liability.principalAmount > 0 
                ? ((liability.principalAmount - liability.currentBalance) / liability.principalAmount) * 100 
                : 0;
              
              return (
                <div key={liability.id} className="card !p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-2xl mr-3">{getLiabilityIcon(liability.type)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium theme-text-primary break-words">{liability.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 text-sm theme-text-secondary">
                          <span className="capitalize">{liability.type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{liability.bankName}</span>
                          <span>•</span>
                          <span>{liability.interestRate}% interest</span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                          <div>
                            <span className="theme-text-muted">Outstanding:</span>
                            <p className="font-medium" style={{ color: 'var(--color-error)' }}>{formatLargeNumber(liability.currentBalance)}</p>
                          </div>
                          <div>
                            <span className="theme-text-muted">Monthly EMI:</span>
                            <p className="font-medium theme-text-primary">{formatCurrency(liability.emiAmount)}</p>
                          </div>
                          <div>
                            <span className="theme-text-muted">Progress:</span>
                            <p className="font-medium text-green-600">{progress.toFixed(1)}%</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="progress-bar">
                            <div
                              className="progress-fill transition-all duration-300"
                              style={{ width: `${progress}%`, backgroundColor: 'var(--color-success)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditLiability(liability)}
                        className="p-2 rounded-lg transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Edit Liability"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLiability(liability.id)}
                        className="p-2 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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