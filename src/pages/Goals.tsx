import React, { useState, useEffect } from 'react';
import { Target, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';

import SidePanel from '../components/common/SidePanel';
import GoalForm from '../components/forms/GoalForm';
import GoalSIPService from '../services/goalSIPService';

import UnifiedGoalCard from '../components/goals/UnifiedGoalCard';
import { Goal } from '../types';

const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal, assets, loadGoals, loadAssets } = useData();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Lazy load goals and assets data when page mounts
  useEffect(() => {
    loadGoals();
    loadAssets();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get SIP assets (mutual funds and EPF with SIP enabled)
  const sipAssets = assets.filter(a => a.isSIP && (a.category === 'mutual_funds' || a.category === 'epf'));

  // Auto-update goals from SIP contributions on mount
  useEffect(() => {
    const updateGoalsFromSIPs = () => {
      goals.forEach(goal => {
        const updatedGoal = GoalSIPService.updateGoalFromSIPs(goal, assets);
        if (updatedGoal.currentAmount !== goal.currentAmount) {
          updateGoal(goal.id, updatedGoal);
        }
      });
    };

    updateGoalsFromSIPs();
  }, []); // Run once on mount

  // Handler functions
  const handleAddGoal = () => {
    setEditingGoal(null);
    setShowGoalForm(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowGoalForm(true);
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

  const handleDeleteGoal = (goal: Goal) => {
    deleteGoal(goal.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Financial Goals</h1>
        <p className="font-medium text-gray-600 dark:text-gray-300 mt-1">
          Monthly Investment: {formatCurrency(goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0))}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">Your Financial Goals</h3>
        <button
          onClick={handleAddGoal}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </button>
      </div>

      {/* Goals List - Using Unified Goal Cards */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <UnifiedGoalCard
              key={goal.id}
              goal={goal}
              sipAssets={sipAssets}
              size="large"
              showDetails={true}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-gray-400 mb-4">
            <Target className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No financial goals set</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first financial goal to start tracking your progress
          </p>
          <button
            onClick={handleAddGoal}
            className="btn-primary flex items-center mx-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Goal
          </button>
        </div>
      )
      }



      {/* Goal Form SidePanel */}
      <SidePanel
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
      </SidePanel>
    </div >
  );
};

export default Goals;