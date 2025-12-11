import { Transaction, Goal } from '../types';

interface GoalContribution {
  id: string;
  transactionId: string;
  goalId: string;
  goalName: string;
  amount: number;
  date: string;
  notes?: string;
}

interface GoalProgress {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  contributedAmount: number;
  progressPercentage: number;
  monthlyAverage: number;
  estimatedCompletion?: string;
  recentContributions: GoalContribution[];
}

class SimpleGoalTracker {
  private contributions: GoalContribution[] = [];

  /**
   * Add a contribution to a goal from a transaction
   */
  addContribution(
    transactionId: string,
    goalId: string,
    goalName: string,
    amount: number,
    date: string,
    notes?: string
  ): GoalContribution {
    const contribution: GoalContribution = {
      id: this.generateId(),
      transactionId,
      goalId,
      goalName,
      amount,
      date,
      notes
    };

    this.contributions.push(contribution);
    console.log(`💰 Added ₹${amount} contribution to ${goalName}`);
    return contribution;
  }

  /**
   * Remove a contribution
   */
  removeContribution(contributionId: string): boolean {
    const index = this.contributions.findIndex(c => c.id === contributionId);
    if (index === -1) return false;

    this.contributions.splice(index, 1);
    return true;
  }

  /**
   * Get all contributions for a goal
   */
  getGoalContributions(goalId: string): GoalContribution[] {
    return this.contributions
      .filter(c => c.goalId === goalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Calculate progress for a goal
   */
  calculateGoalProgress(goal: Goal): GoalProgress {
    const contributions = this.getGoalContributions(goal.id);
    const contributedAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
    const progressPercentage = goal.targetAmount > 0 ? 
      Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;

    // Calculate monthly average (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentContributions = contributions.filter(c => 
      new Date(c.date) >= sixMonthsAgo
    );
    
    const monthlyAverage = recentContributions.length > 0 ? 
      recentContributions.reduce((sum, c) => sum + c.amount, 0) / 6 : 0;

    // Estimate completion date
    let estimatedCompletion: string | undefined;
    if (monthlyAverage > 0 && progressPercentage < 100) {
      const remainingAmount = goal.targetAmount - goal.currentAmount;
      const monthsToComplete = remainingAmount / monthlyAverage;
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + monthsToComplete);
      estimatedCompletion = completionDate.toISOString().split('T')[0];
    }

    return {
      goalId: goal.id,
      goalName: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      contributedAmount,
      progressPercentage,
      monthlyAverage,
      estimatedCompletion,
      recentContributions: contributions.slice(0, 5) // Last 5 contributions
    };
  }

  /**
   * Get progress for all goals
   */
  getAllGoalProgress(goals: Goal[]): GoalProgress[] {
    return goals.map(goal => this.calculateGoalProgress(goal));
  }

  /**
   * Auto-suggest goal for transaction based on simple keyword matching
   */
  suggestGoalForTransaction(transaction: Transaction, goals: Goal[]): Goal | null {
    const description = transaction.description.toLowerCase();
    
    // Simple keyword matching
    for (const goal of goals) {
      const goalKeywords = goal.name.toLowerCase().split(' ');
      const categoryKeywords = goal.category.toLowerCase().split('_');
      
      const allKeywords = [...goalKeywords, ...categoryKeywords];
      
      if (allKeywords.some(keyword => 
        keyword.length > 2 && description.includes(keyword)
      )) {
        return goal;
      }
    }

    return null;
  }

  /**
   * Get monthly contribution summary
   */
  getMonthlyContributionSummary(year: number, month: number): {
    totalContributions: number;
    goalBreakdown: Array<{ goalName: string; amount: number; percentage: number }>;
  } {
    const monthContributions = this.contributions.filter(c => {
      const date = new Date(c.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const totalContributions = monthContributions.reduce((sum, c) => sum + c.amount, 0);
    
    // Group by goal
    const goalTotals = monthContributions.reduce((acc, c) => {
      acc[c.goalName] = (acc[c.goalName] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

    const goalBreakdown = Object.entries(goalTotals).map(([goalName, amount]) => ({
      goalName,
      amount,
      percentage: totalContributions > 0 ? (amount / totalContributions) * 100 : 0
    }));

    return { totalContributions, goalBreakdown };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export default SimpleGoalTracker;
export type { GoalContribution, GoalProgress };