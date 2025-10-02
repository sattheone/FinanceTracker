import React, { useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { Goal } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

const GoalsStep: React.FC = () => {
  const { goals, addGoal, deleteGoal, userProfile } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    monthlyContribution: 0,
    category: 'other' as Goal['category'],
  });

  const goalCategories = [
    { value: 'retirement', label: 'Retirement', icon: '🏖️' },
    { value: 'education', label: 'Education', icon: '🎓' },
    { value: 'marriage', label: 'Marriage', icon: '💒' },
    { value: 'other', label: 'Other', icon: '🎯' },
  ];

  const handleAddGoal = () => {
    if (newGoal.name && newGoal.targetAmount > 0 && newGoal.targetDate) {
      addGoal({
        ...newGoal,
        expectedReturnRate: 12, // Default 12% return
        isInflationAdjusted: false // Default to nominal
      });
      setNewGoal({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        targetDate: '',
        monthlyContribution: 0,
        category: 'other',
      });
      setShowAddForm(false);
    }
  };

  const calculateRequiredSIP = (targetAmount: number, currentAmount: number, targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const monthsRemaining = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    // Simple calculation assuming 12% annual return
    const monthlyRate = 0.12 / 12;
    const futureValueOfCurrent = currentAmount * Math.pow(1 + monthlyRate, monthsRemaining);
    const remainingAmount = Math.max(0, targetAmount - futureValueOfCurrent);
    
    if (remainingAmount === 0) return 0;
    
    // PMT calculation for SIP
    const requiredSIP = remainingAmount * monthlyRate / (Math.pow(1 + monthlyRate, monthsRemaining) - 1);
    return Math.ceil(requiredSIP);
  };

  const totalGoalValue = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrentValue = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalMonthlySIP = goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);

  // Auto-suggest retirement goal based on user profile
  const suggestRetirementGoal = () => {
    if (!userProfile?.financialInfo) return;
    
    const { currentAge, retirementAge, monthlyExpenses } = userProfile.financialInfo;
    const yearsToRetirement = retirementAge - currentAge;
    
    if (yearsToRetirement > 0) {
      // Estimate retirement corpus needed (25x annual expenses, inflated)
      const inflatedAnnualExpenses = monthlyExpenses * 12 * Math.pow(1.06, yearsToRetirement);
      const requiredCorpus = inflatedAnnualExpenses * 25;
      
      setNewGoal({
        name: 'Retirement Fund',
        targetAmount: Math.round(requiredCorpus),
        currentAmount: 0,
        targetDate: new Date(new Date().getFullYear() + yearsToRetirement, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0],
        monthlyContribution: 0,
        category: 'retirement',
      });
      setShowAddForm(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Financial Goals</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Set your financial goals and track your progress towards achieving them.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Goal Value</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatCurrency(totalGoalValue)}
          </p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Progress</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(totalCurrentValue)}
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly SIP</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(totalMonthlySIP)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </button>
        {!goals.some(g => g.category === 'retirement') && (
          <button
            onClick={suggestRetirementGoal}
            className="btn-secondary flex items-center"
          >
            <Target className="w-4 h-4 mr-2" />
            Suggest Retirement Goal
          </button>
        )}
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-500">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Goal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Goal Name
              </label>
              <input
                type="text"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Child's Education, House Down Payment"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Category
              </label>
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as Goal['category'] })}
                className="input-field"
              >
                {goalCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Target Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={newGoal.targetAmount || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Current Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={newGoal.currentAmount || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Monthly SIP
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={newGoal.monthlyContribution || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
              {newGoal.targetAmount > 0 && newGoal.targetDate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Suggested SIP: {formatCurrency(calculateRequiredSIP(newGoal.targetAmount, newGoal.currentAmount, newGoal.targetDate))}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddGoal} className="btn-primary">
              Add Goal
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

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No goals set yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Start by setting your financial goals to create a roadmap for your future.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Set Your First Goal
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const category = goalCategories.find(cat => cat.value === goal.category);
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const remainingAmount = goal.targetAmount - goal.currentAmount;
            
            return (
              <div key={goal.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{category?.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{goal.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{category?.label} Goal</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Target Amount</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Current Amount</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(goal.currentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Monthly SIP</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(goal.monthlyContribution)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Target Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Progress</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>₹0</span>
                        <span>Remaining: {formatCurrency(remainingAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteGoal(goal.id)}
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
    </div>
  );
};

export default GoalsStep;