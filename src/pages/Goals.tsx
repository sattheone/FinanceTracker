import React, { useState } from 'react';
import { Target, TrendingUp, Calendar, DollarSign, Plus, Edit3, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, formatLargeNumber } from '../utils/formatters';
import Modal from '../components/common/Modal';
import GoalForm from '../components/forms/GoalForm';
import { Goal } from '../types';

const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useData();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'retirement': return '🏖️';
      case 'education': return '🎓';
      case 'marriage': return '💒';
      default: return '🎯';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'retirement': return 'border-purple-200 bg-purple-50';
      case 'education': return 'border-blue-200 bg-blue-50';
      case 'marriage': return 'border-pink-200 bg-pink-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const calculateMonthsRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
  };

  // Handler functions
  const handleAddGoal = () => {
    setEditingGoal(null);
    setShowGoalForm(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowGoalForm(true);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(goalId);
    }
  };

  const handleGoalSubmit = (goalData: Omit<Goal, 'id'>) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
    } else {
      addGoal(goalData);
    }
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  const handleGoalCancel = () => {
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Goals</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track progress towards your financial objectives</p>
      </div>

      {/* Goals Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card text-center">
          <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Total Goals</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{goals.length}</p>
        </div>
        <div className="metric-card text-center">
          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Total Target</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatLargeNumber(goals.reduce((sum, goal) => sum + goal.targetAmount, 0))}
          </p>
        </div>
        <div className="metric-card text-center">
          <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Monthly Investment</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0))}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Financial Goals</h3>
        <button
          onClick={handleAddGoal}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const monthsRemaining = calculateMonthsRemaining(goal.targetDate);
          const yearsRemaining = Math.floor(monthsRemaining / 12);
          const remainingMonths = monthsRemaining % 12;
          
          return (
            <div key={goal.id} className={`card border-l-4 ${getCategoryColor(goal.category)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{getCategoryIcon(goal.category)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{goal.category} Goal</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Target Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatLargeNumber(goal.targetAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Current Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatLargeNumber(goal.currentAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly SIP</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(goal.monthlyContribution)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Time Remaining</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {yearsRemaining > 0 && `${yearsRemaining}y `}
                        {remainingMonths}m
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>₹0</span>
                      <span>{formatLargeNumber(goal.targetAmount)}</span>
                    </div>
                  </div>

                  {/* Target Date */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Target Date: {formatDate(goal.targetDate)}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Goal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Goal"
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
      </div>

      {/* Goal Categories Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['retirement', 'education', 'marriage'].map((category) => {
            const categoryGoals = goals.filter(g => g.category === category);
            const totalTarget = categoryGoals.reduce((sum, g) => sum + g.targetAmount, 0);
            const totalCurrent = categoryGoals.reduce((sum, g) => sum + g.currentAmount, 0);
            const totalMonthly = categoryGoals.reduce((sum, g) => sum + g.monthlyContribution, 0);
            const avgProgress = categoryGoals.length > 0 
              ? categoryGoals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount * 100), 0) / categoryGoals.length 
              : 0;

            return (
              <div key={category} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-xl mr-2">{getCategoryIcon(category)}</span>
                  <h4 className="font-medium text-gray-900 capitalize">{category}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goals:</span>
                    <span className="font-medium">{categoryGoals.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">{formatLargeNumber(totalTarget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">{formatLargeNumber(totalCurrent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly:</span>
                    <span className="font-medium">{formatCurrency(totalMonthly)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Progress:</span>
                    <span className="font-medium">{avgProgress.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goal Form Modal */}
      <Modal
        isOpen={showGoalForm}
        onClose={handleGoalCancel}
        title={editingGoal ? 'Edit Goal' : 'Add New Goal'}
        size="lg"
      >
        <GoalForm
          goal={editingGoal || undefined}
          onSubmit={handleGoalSubmit}
          onCancel={handleGoalCancel}
        />
      </Modal>
    </div>
  );
};

export default Goals;