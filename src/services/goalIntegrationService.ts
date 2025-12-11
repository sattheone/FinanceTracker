import { Goal, RecurringTransaction, Transaction } from '../types';

// Removed unused interface

class GoalIntegrationService {
  /**
   * Link a recurring transaction to a goal
   */
  linkRecurringToGoal(goal: Goal, recurringTransactionId: string): Goal {
    const updatedLinkedTransactions = [...(goal.linkedRecurringTransactions || [])];
    if (!updatedLinkedTransactions.includes(recurringTransactionId)) {
      updatedLinkedTransactions.push(recurringTransactionId);
    }

    return {
      ...goal,
      linkedRecurringTransactions: updatedLinkedTransactions
    };
  }

  /**
   * Unlink a recurring transaction from a goal
   */
  unlinkRecurringFromGoal(goal: Goal, recurringTransactionId: string): Goal {
    return {
      ...goal,
      linkedRecurringTransactions: (goal.linkedRecurringTransactions || []).filter(
        id => id !== recurringTransactionId
      )
    };
  }

  /**
   * Update goal progress when a linked recurring transaction is marked as paid
   */
  updateGoalFromRecurringPayment(
    goal: Goal,
    recurringTransaction: RecurringTransaction,
    paidAmount?: number
  ): Goal {
    if (!goal.autoUpdateFromTransactions) {
      return goal;
    }

    if (!(goal.linkedRecurringTransactions || []).includes(recurringTransaction.id)) {
      return goal;
    }

    const contributionAmount = paidAmount || recurringTransaction.amount;

    return {
      ...goal,
      currentAmount: goal.currentAmount + contributionAmount
    };
  }

  /**
   * Update goal progress from transaction categorization
   */
  updateGoalFromTransaction(goal: Goal, transaction: Transaction): Goal {
    if (!goal.autoUpdateFromTransactions) {
      return goal;
    }

    // Check if transaction category is linked to this goal
    if (!(goal.linkedTransactionCategories || []).includes(transaction.category)) {
      return goal;
    }

    // Only add positive contributions (investments, savings)
    if (transaction.type === 'investment' ||
      (transaction.type === 'expense' && transaction.category.toLowerCase().includes('investment'))) {
      return {
        ...goal,
        currentAmount: goal.currentAmount + transaction.amount
      };
    }

    return goal;
  }

  /**
   * Calculate goal health score (0-100)
   */
  calculateGoalHealth(goal: Goal, linkedRecurring: RecurringTransaction[] = []): {
    score: number;
    factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }>;
  } {
    const factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }> = [];
    let score = 50; // Base score

    // Progress factor
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    if (progress >= 75) {
      score += 20;
      factors.push({ factor: 'Progress', impact: 'positive', description: 'Excellent progress towards target' });
    } else if (progress >= 50) {
      score += 10;
      factors.push({ factor: 'Progress', impact: 'positive', description: 'Good progress towards target' });
    } else if (progress < 25) {
      score -= 15;
      factors.push({ factor: 'Progress', impact: 'negative', description: 'Low progress towards target' });
    }

    // Time factor
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      score -= 30;
      factors.push({ factor: 'Timeline', impact: 'negative', description: 'Goal is overdue' });
    } else if (daysRemaining < 365) {
      score -= 10;
      factors.push({ factor: 'Timeline', impact: 'negative', description: 'Less than a year remaining' });
    }

    // Contribution consistency factor
    const totalLinkedAmount = linkedRecurring.reduce((sum, rt) => sum + rt.amount, 0);
    const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
    const monthlyRate = goal.expectedReturnRate / 100 / 12;
    const futureValueOfCurrent = goal.currentAmount * Math.pow(1 + monthlyRate, monthsRemaining);
    const remainingAfterGrowth = Math.max(0, goal.targetAmount - futureValueOfCurrent);
    const requiredMonthlySIP = remainingAfterGrowth > 0 && monthsRemaining > 0
      ? remainingAfterGrowth * monthlyRate / (Math.pow(1 + monthlyRate, monthsRemaining) - 1)
      : 0;

    const totalMonthlyContribution = goal.monthlyContribution + totalLinkedAmount;

    if (totalMonthlyContribution >= requiredMonthlySIP * 1.1) {
      score += 15;
      factors.push({ factor: 'Contributions', impact: 'positive', description: 'Contributing more than required' });
    } else if (totalMonthlyContribution >= requiredMonthlySIP * 0.9) {
      score += 10;
      factors.push({ factor: 'Contributions', impact: 'positive', description: 'Contributing adequate amount' });
    } else {
      score -= 20;
      factors.push({ factor: 'Contributions', impact: 'negative', description: 'Contributing less than required' });
    }

    // Automation factor
    if (linkedRecurring.length > 0) {
      score += 10;
      factors.push({ factor: 'Automation', impact: 'positive', description: 'Automated contributions via SIPs' });
    } else {
      factors.push({ factor: 'Automation', impact: 'neutral', description: 'No automated contributions set up' });
    }

    // Priority factor
    if (goal.priority === 'high') {
      score += 5;
      factors.push({ factor: 'Priority', impact: 'positive', description: 'High priority goal' });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors
    };
  }

  /**
   * Suggest recurring transactions for a goal
   */
  suggestRecurringForGoal(
    goal: Goal,
    recurringTransactions: RecurringTransaction[]
  ): RecurringTransaction[] {
    const suggestions: RecurringTransaction[] = [];

    // Look for investment-related recurring transactions
    const investmentRecurring = recurringTransactions.filter(rt =>
      rt.type === 'investment' ||
      rt.category.toLowerCase().includes('investment') ||
      rt.category.toLowerCase().includes('sip') ||
      rt.category.toLowerCase().includes('mutual') ||
      rt.description.toLowerCase().includes('sip') ||
      rt.description.toLowerCase().includes('mutual fund')
    );

    // Match by goal category
    const categoryKeywords = {
      retirement: ['retirement', 'pension', 'pf', 'ppf', 'nps'],
      education: ['education', 'school', 'college', 'course'],
      marriage: ['marriage', 'wedding'],
      house: ['house', 'home', 'property', 'real estate'],
      emergency: ['emergency', 'liquid', 'savings'],
      vacation: ['vacation', 'travel', 'trip']
    };

    const goalKeywords = categoryKeywords[goal.category as keyof typeof categoryKeywords] || [];

    for (const rt of investmentRecurring) {
      // Skip if already linked
      if ((goal.linkedRecurringTransactions || []).includes(rt.id)) continue;

      // Check for keyword matches
      const description = rt.description.toLowerCase();
      const name = rt.name.toLowerCase();

      if (goalKeywords.some(keyword =>
        description.includes(keyword) || name.includes(keyword)
      )) {
        suggestions.push(rt);
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Generate goal recommendations
   */
  generateGoalRecommendations(goal: Goal, linkedRecurring: RecurringTransaction[]): Array<{
    type: 'increase_sip' | 'add_sip' | 'extend_timeline' | 'reduce_target';
    title: string;
    description: string;
    impact: string;
    actionRequired: string;
  }> {
    const recommendations: Array<{
      type: 'increase_sip' | 'add_sip' | 'extend_timeline' | 'reduce_target';
      title: string;
      description: string;
      impact: string;
      actionRequired: string;
    }> = [];

    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

    const monthlyRate = goal.expectedReturnRate / 100 / 12;
    const futureValueOfCurrent = goal.currentAmount * Math.pow(1 + monthlyRate, monthsRemaining);
    const remainingAfterGrowth = Math.max(0, goal.targetAmount - futureValueOfCurrent);
    const requiredMonthlySIP = remainingAfterGrowth > 0 && monthsRemaining > 0
      ? remainingAfterGrowth * monthlyRate / (Math.pow(1 + monthlyRate, monthsRemaining) - 1)
      : 0;

    const totalLinkedAmount = linkedRecurring.reduce((sum, rt) => sum + rt.amount, 0);
    const totalMonthlyContribution = goal.monthlyContribution + totalLinkedAmount;

    // Check if contributions are insufficient
    if (totalMonthlyContribution < requiredMonthlySIP * 0.9) {
      const shortfall = requiredMonthlySIP - totalMonthlyContribution;

      if (linkedRecurring.length === 0) {
        recommendations.push({
          type: 'add_sip',
          title: 'Set up automated SIP',
          description: 'Start a systematic investment plan to automate your contributions',
          impact: `Achieve goal with ₹${Math.round(requiredMonthlySIP)} monthly SIP`,
          actionRequired: 'Link or create a recurring investment transaction'
        });
      } else {
        recommendations.push({
          type: 'increase_sip',
          title: 'Increase monthly contributions',
          description: `You need ₹${Math.round(shortfall)} more per month to reach your goal on time`,
          impact: `Increase total monthly contribution to ₹${Math.round(requiredMonthlySIP)}`,
          actionRequired: 'Increase existing SIP amount or add new SIP'
        });
      }
    }

    // Check if timeline is too aggressive
    if (daysRemaining < 365 && goal.currentAmount < goal.targetAmount * 0.8) {
      recommendations.push({
        type: 'extend_timeline',
        title: 'Consider extending timeline',
        description: 'Your goal timeline might be too aggressive given current progress',
        impact: 'Reduce monthly contribution requirement',
        actionRequired: 'Extend target date by 1-2 years'
      });
    }

    return recommendations;
  }
}

export default new GoalIntegrationService();