import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingDown, Calendar, DollarSign, Plus, Edit3, Trash2, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, formatLargeNumber } from '../utils/formatters';
import SidePanel from '../components/common/SidePanel';
import LiabilityForm from '../components/forms/LiabilityForm';
import { Liability } from '../types';
import { calculateAmortizationDetails, generateAmortizationSchedule } from '../utils/loanCalculations';
import RepaymentScheduleModal from '../components/liabilities/RepaymentScheduleModal';

const Liabilities: React.FC = () => {
  const { liabilities, addLiability, updateLiability, deleteLiability, loadLiabilities } = useData();
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLiabilityForSchedule, setSelectedLiabilityForSchedule] = useState<Liability | null>(null);

  // Lazy load liabilities data when page mounts
  useEffect(() => {
    loadLiabilities();
  }, []);

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

  const getLiabilityColor = (type: string) => {
    switch (type) {
      case 'home_loan': return 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20';
      case 'personal_loan': return 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20';
      case 'car_loan': return 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
      case 'credit_card': return 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
      case 'education_loan': return 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20';
      case 'business_loan': return 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20';
      default: return 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700';
    }
  };

  // Handler functions
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
    // Handle marking past dues as paid
    if ((liabilityData as any).markPastDuesAsPaid) {
      const schedule = generateAmortizationSchedule(
        liabilityData.principalAmount,
        liabilityData.interestRate,
        liabilityData.emiAmount,
        liabilityData.startDate
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const paidInstallments: number[] = [];
      let totalPrincipalPaid = 0;
      
      schedule.forEach((installment) => {
        const dueDate = new Date(installment.installmentDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // Validate date and check if it's in the past
        if (!isNaN(dueDate.getTime()) && dueDate < today) {
          paidInstallments.push(installment.installmentNumber);
          totalPrincipalPaid += installment.principalPaid;
        }
      });
      
      // Calculate remaining balance
      const newBalance = Math.max(0, liabilityData.principalAmount - totalPrincipalPaid);
      
      const updatedData = {
        ...liabilityData,
        paidInstallments,
        currentBalance: newBalance,
      };
      
      // Remove the temporary flag before saving
      delete (updatedData as any).markPastDuesAsPaid;
      
      if (editingLiability) {
        updateLiability(editingLiability.id, updatedData);
      } else {
        addLiability(updatedData);
      }
    } else {
      // Remove the temporary flag before saving
      const cleanedData = { ...liabilityData };
      delete (cleanedData as any).markPastDuesAsPaid;
      
      if (editingLiability) {
        updateLiability(editingLiability.id, cleanedData);
      } else {
        addLiability(cleanedData);
      }
    }
    
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  const handleLiabilityCancel = () => {
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  const handleViewSchedule = (liability: Liability) => {
    setSelectedLiabilityForSchedule(liability);
    setShowScheduleModal(true);
  };

  const handleMarkInstallmentPaid = async (installmentNumber: number) => {
    if (!selectedLiabilityForSchedule) return;
    const liab = selectedLiabilityForSchedule;
    const schedule = generateAmortizationSchedule(
      liab.principalAmount,
      liab.interestRate,
      liab.emiAmount,
      liab.startDate
    );
    const existing = new Set(liab.paidInstallments || []);
    existing.add(installmentNumber);
    const paidList = Array.from(existing).sort((a, b) => a - b);
    const totalPrincipalPaid = schedule
      .filter(e => paidList.includes(e.installmentNumber))
      .reduce((sum, e) => sum + e.principalPaid, 0);
    const newBalance = Math.max(0, liab.principalAmount - totalPrincipalPaid);
    await updateLiability(liab.id, { paidInstallments: paidList, currentBalance: newBalance });
    // Reflect updated liability in modal state
    setSelectedLiabilityForSchedule({ ...liab, paidInstallments: paidList, currentBalance: newBalance });
  };

  // Calculate totals
  const totalPrincipal = liabilities.reduce((sum, liability) => sum + liability.principalAmount, 0);
  const totalOutstanding = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const totalMonthlyEMI = liabilities.reduce((sum, liability) => sum + liability.emiAmount, 0);

  // Calculate total interest remaining for all liabilities
  const totalInterestRemaining = liabilities.reduce((sum, liability) => {
    const amort = calculateAmortizationDetails(
      liability.currentBalance,
      liability.interestRate,
      liability.emiAmount,
      new Date().toISOString().split('T')[0]
    );
    return sum + amort.totalInterestPaid;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Liabilities & Debts</h1>
        <p className="text-gray-600 dark:text-gray-300 dark:text-gray-400 mt-1">Manage your loans, EMIs, and debt obligations</p>
      </div>

      {/* Liabilities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card text-center">
          <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatLargeNumber(totalOutstanding)}
          </p>
        </div>
        <div className="metric-card text-center">
          <TrendingDown className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly EMI</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalMonthlyEMI)}
          </p>
        </div>
        <div className="metric-card text-center">
          <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Principal Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatLargeNumber(totalPrincipal - totalOutstanding)}
          </p>
        </div>
        <div className="metric-card text-center">
          <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Interest Remaining</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatLargeNumber(totalInterestRemaining)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">Your Liabilities</h3>
        <button
          onClick={handleAddLiability}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Liability
        </button>
      </div>

      {/* Liabilities List */}
      <div className="space-y-4">
        {liabilities.map((liability) => {
          // Calculate amortization from current balance (not from principal)
          const amortization = calculateAmortizationDetails(
            liability.currentBalance, // Use current balance as the starting point
            liability.interestRate,
            liability.emiAmount,
            new Date().toISOString().split('T')[0] // Calculate from today
          );

          const progress = liability.principalAmount > 0
            ? ((liability.principalAmount - liability.currentBalance) / liability.principalAmount) * 100
            : 0;

          // Check if EMI is due soon (assuming EMI date is start date + monthly intervals)
          const nextDueDate = amortization.nextInstallmentDate;
          const today = new Date();
          const diffTime = nextDueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isEMIDueSoon = diffDays >= 0 && diffDays <= 5;

          return (
            <div key={liability.id} className={`card border-l-4 ${getLiabilityColor(liability.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{getLiabilityIcon(liability.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">{liability.name}</h3>
                        {isEMIDueSoon && (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:text-orange-200">
                            EMI Due Soon
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className="capitalize">{liability.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{liability.bankName}</span>
                        <span>•</span>
                        <span>{liability.interestRate}% interest</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Principal Amount</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                        {formatLargeNumber(liability.principalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Outstanding</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatLargeNumber(liability.currentBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly EMI</p>
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(liability.emiAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Remaining EMIs</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {amortization.remainingInstallments}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Repayment Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Paid: {formatLargeNumber(liability.principalAmount - liability.currentBalance)}</span>
                      <span>Outstanding: {formatLargeNumber(liability.currentBalance)}</span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Interest Remaining:</span>
                      <span className="ml-2 font-medium text-orange-600">
                        {formatCurrency(amortization.totalInterestPaid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Loan End Date:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatDate(amortization.completionDate.toISOString())}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Next Due:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {amortization.remainingInstallments > 0 ? formatDate(amortization.nextInstallmentDate.toISOString()) : 'Completed'}
                      </span>
                    </div>
                    <div>
                      <button
                        onClick={() => handleViewSchedule(liability)}
                        className="text-left text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                      >
                        View Full Schedule
                      </button>
                    </div>
                  </div>

                  {liability.description && (
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300">
                      {liability.description}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="h-4 w-4 mr-2" />
                      Started: {formatDate(liability.startDate)}
                      {liability.accountNumber && (
                        <span className="ml-4">Account: {liability.accountNumber}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
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
              </div>
            </div>
          );
        })}

        {liabilities.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <CreditCard className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-2">No liabilities added yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by adding your loans, EMIs, and other debt obligations to track your financial health.
            </p>
            <button
              onClick={handleAddLiability}
              className="btn-primary"
            >
              Add Your First Liability
            </button>
          </div>
        )}
      </div>

      {/* Liability Summary by Type */}
      {liabilities.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">Liabilities by Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['home_loan', 'personal_loan', 'car_loan', 'credit_card', 'education_loan', 'business_loan'].map((type) => {
              const typeLiabilities = liabilities.filter(l => l.type === type);
              if (typeLiabilities.length === 0) return null;

              const typeOutstanding = typeLiabilities.reduce((sum, l) => sum + l.currentBalance, 0);
              const typeEMI = typeLiabilities.reduce((sum, l) => sum + l.emiAmount, 0);
              const typePrincipal = typeLiabilities.reduce((sum, l) => sum + l.principalAmount, 0);
              const typeProgress = typePrincipal > 0 ? ((typePrincipal - typeOutstanding) / typePrincipal * 100) : 0;

              return (
                <div key={type} className="p-4 border border-gray-200 dark:border-gray-600 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center mb-3">
                    <span className="text-xl mr-2">{getLiabilityIcon(type)}</span>
                    <h4 className="font-medium text-gray-900 dark:text-white dark:text-white capitalize">{type.replace('_', ' ')}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Count:</span>
                      <span className="font-medium">{typeLiabilities.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Outstanding:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{formatLargeNumber(typeOutstanding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Monthly EMI:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(typeEMI)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Progress:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{typeProgress.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liability Form SidePanel */}
      <SidePanel
        isOpen={showLiabilityForm}
        onClose={handleLiabilityCancel}
        title={editingLiability ? 'Edit Liability' : 'Add New Liability'}
        size="lg"
        footer={
          <div className="flex justify-end w-full space-x-2">
            <button
              onClick={handleLiabilityCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="liability-form" // Assumes LiabilityForm has a form with id="liability-form"
              className="btn-primary"
            >
              {editingLiability ? 'Update Liability' : 'Add Liability'}
            </button>
          </div>
        }
      >
        <LiabilityForm
          liability={editingLiability || undefined}
          onSubmit={handleLiabilitySubmit}
          onCancel={handleLiabilityCancel}
        />
      </SidePanel>

      {/* Repayment Schedule Modal */}
      {selectedLiabilityForSchedule && (() => {
        const schedule = generateAmortizationSchedule(
          selectedLiabilityForSchedule.principalAmount,
          selectedLiabilityForSchedule.interestRate,
          selectedLiabilityForSchedule.emiAmount,
          selectedLiabilityForSchedule.startDate
        );
        
        // Calculate which installments should be marked as paid based on due date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const paidInstallments = selectedLiabilityForSchedule.paidInstallments || [];
        
        // Add any past dues that aren't already marked as paid
        const allPaidInstallments = new Set(paidInstallments);
        schedule.forEach((installment) => {
          const dueDate = new Date(installment.installmentDate);
          dueDate.setHours(0, 0, 0, 0);
          
          // Mark as paid if due date is before or equal to today
          if (dueDate <= today) {
            allPaidInstallments.add(installment.installmentNumber);
          }
        });
        
        return (
          <RepaymentScheduleModal
            isOpen={showScheduleModal}
            onClose={() => {
              setShowScheduleModal(false);
              setSelectedLiabilityForSchedule(null);
            }}
            schedule={schedule}
            liabilityName={selectedLiabilityForSchedule.name}
            paidInstallments={Array.from(allPaidInstallments)}
            onMarkPaid={handleMarkInstallmentPaid}
          />
        );
      })()}
    </div>
  );
};

export default Liabilities;