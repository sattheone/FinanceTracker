import React, { useState } from 'react';
import { CreditCard, TrendingDown, Calendar, DollarSign, Plus, Edit3, Trash2, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, formatLargeNumber } from '../utils/formatters';
import Modal from '../components/common/Modal';
import LiabilityForm from '../components/forms/LiabilityForm';
import { Liability } from '../types';

const Liabilities: React.FC = () => {
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

  const getLiabilityColor = (type: string) => {
    switch (type) {
      case 'home_loan': return 'border-blue-200 bg-blue-50';
      case 'personal_loan': return 'border-yellow-200 bg-yellow-50';
      case 'car_loan': return 'border-green-200 bg-green-50';
      case 'credit_card': return 'border-red-200 bg-red-50';
      case 'education_loan': return 'border-purple-200 bg-purple-50';
      case 'business_loan': return 'border-indigo-200 bg-indigo-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const calculateRemainingTenure = (liability: Liability) => {
    if (liability.emiAmount <= 0 || liability.currentBalance <= 0 || liability.interestRate <= 0) {
      return 0;
    }

    const monthlyRate = liability.interestRate / 100 / 12;
    const balance = liability.currentBalance;
    const emi = liability.emiAmount;

    // Calculate remaining months using loan balance formula
    const remainingMonths = Math.log(1 + (balance * monthlyRate) / emi) / Math.log(1 + monthlyRate);
    return Math.ceil(remainingMonths);
  };

  const calculateTotalInterest = (liability: Liability) => {
    const remainingMonths = calculateRemainingTenure(liability);
    const totalPayments = remainingMonths * liability.emiAmount;
    return Math.max(0, totalPayments - liability.currentBalance);
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

  // Calculate totals
  const totalPrincipal = liabilities.reduce((sum, liability) => sum + liability.principalAmount, 0);
  const totalOutstanding = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const totalMonthlyEMI = liabilities.reduce((sum, liability) => sum + liability.emiAmount, 0);
  const totalInterestRemaining = liabilities.reduce((sum, liability) => sum + calculateTotalInterest(liability), 0);

  // Upcoming EMI payments (next 30 days)
  const today = new Date();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Liabilities & Debts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your loans, EMIs, and debt obligations</p>
      </div>

      {/* Liabilities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card text-center">
          <CreditCard className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">
            {formatLargeNumber(totalOutstanding)}
          </p>
        </div>
        <div className="metric-card text-center">
          <TrendingDown className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Monthly EMI</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalMonthlyEMI)}
          </p>
        </div>
        <div className="metric-card text-center">
          <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Principal Paid</p>
          <p className="text-2xl font-bold text-green-600">
            {formatLargeNumber(totalPrincipal - totalOutstanding)}
          </p>
        </div>
        <div className="metric-card text-center">
          <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Interest Remaining</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatLargeNumber(totalInterestRemaining)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Liabilities</h3>
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
          const progress = liability.principalAmount > 0 
            ? ((liability.principalAmount - liability.currentBalance) / liability.principalAmount) * 100 
            : 0;
          const remainingMonths = calculateRemainingTenure(liability);
          const remainingYears = Math.floor(remainingMonths / 12);
          const remainingMonthsOnly = remainingMonths % 12;
          const totalInterest = calculateTotalInterest(liability);
          
          // Check if EMI is due soon (assuming EMI date is start date + monthly intervals)
          const startDate = new Date(liability.startDate);
          const dayOfMonth = startDate.getDate();
          const currentDay = today.getDate();
          const isEMIDueSoon = Math.abs(currentDay - dayOfMonth) <= 3 || (dayOfMonth - currentDay) <= 3;
          
          return (
            <div key={liability.id} className={`card border-l-4 ${getLiabilityColor(liability.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{getLiabilityIcon(liability.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{liability.name}</h3>
                        {isEMIDueSoon && (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                            EMI Due Soon
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Principal Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatLargeNumber(liability.principalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatLargeNumber(liability.currentBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly EMI</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(liability.emiAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining Tenure</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {remainingYears > 0 && `${remainingYears}y `}
                        {remainingMonthsOnly}m
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Repayment Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Paid: {formatLargeNumber(liability.principalAmount - liability.currentBalance)}</span>
                      <span>Outstanding: {formatLargeNumber(liability.currentBalance)}</span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Interest Remaining:</span>
                      <span className="ml-2 font-medium text-orange-600">
                        {formatCurrency(totalInterest)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Loan End Date:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formatDate(liability.endDate)}
                      </span>
                    </div>
                  </div>

                  {liability.description && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                      {liability.description}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Started: {formatDate(liability.startDate)}
                      {liability.accountNumber && (
                        <span className="ml-4">Account: {liability.accountNumber}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditLiability(liability)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Liability"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLiability(liability.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No liabilities added yet</h3>
            <p className="text-gray-500 mb-4">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Liabilities by Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['home_loan', 'personal_loan', 'car_loan', 'credit_card', 'education_loan', 'business_loan'].map((type) => {
              const typeLiabilities = liabilities.filter(l => l.type === type);
              if (typeLiabilities.length === 0) return null;

              const typeOutstanding = typeLiabilities.reduce((sum, l) => sum + l.currentBalance, 0);
              const typeEMI = typeLiabilities.reduce((sum, l) => sum + l.emiAmount, 0);
              const typePrincipal = typeLiabilities.reduce((sum, l) => sum + l.principalAmount, 0);
              const typeProgress = typePrincipal > 0 ? ((typePrincipal - typeOutstanding) / typePrincipal * 100) : 0;

              return (
                <div key={type} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <span className="text-xl mr-2">{getLiabilityIcon(type)}</span>
                    <h4 className="font-medium text-gray-900 capitalize">{type.replace('_', ' ')}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Count:</span>
                      <span className="font-medium">{typeLiabilities.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding:</span>
                      <span className="font-medium text-red-600">{formatLargeNumber(typeOutstanding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly EMI:</span>
                      <span className="font-medium text-blue-600">{formatCurrency(typeEMI)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-medium text-green-600">{typeProgress.toFixed(1)}%</span>
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

export default Liabilities;