import { Transaction, MonthlyBudget } from '../types';

// Enhanced categorization system similar to Mint
export interface CategoryHierarchy {
  id: string;
  name: string;
  parentId?: string;
  icon: string;
  color: string;
  budgetLimit?: number;
  subCategories?: CategoryHierarchy[];
}

export interface MerchantData {
  id: string;
  name: string;
  aliases: string[];
  defaultCategory: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  website?: string;
  logo?: string;
}

export interface SpendingInsight {
  id: string;
  type: 'trend' | 'alert' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  category?: string;
  amount?: number;
  percentage?: number;
  timeframe: string;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: {
    type: 'budget_adjust' | 'category_review' | 'goal_update';
    label: string;
    data: any;
  };
}

export interface BudgetAlert {
  id: string;
  category: string;
  budgetLimit: number;
  currentSpending: number;
  percentage: number;
  alertType: 'approaching' | 'exceeded' | 'on_track';
  message: string;
  recommendations: string[];
}

export class MintLikeFeatures {
  private static instance: MintLikeFeatures;
  
  // Default category hierarchy similar to Mint
  private defaultCategories: CategoryHierarchy[] = [
    {
      id: 'food',
      name: 'Food & Dining',
      icon: '🍽️',
      color: '#FF6B6B',
      subCategories: [
        { id: 'restaurants', name: 'Restaurants', parentId: 'food', icon: '🍽️', color: '#FF6B6B' },
        { id: 'groceries', name: 'Groceries', parentId: 'food', icon: '🛒', color: '#FF8E8E' },
        { id: 'coffee', name: 'Coffee Shops', parentId: 'food', icon: '☕', color: '#FFB1B1' },
        { id: 'fast_food', name: 'Fast Food', parentId: 'food', icon: '🍔', color: '#FFD4D4' }
      ]
    },
    {
      id: 'transportation',
      name: 'Transportation',
      icon: '🚗',
      color: '#4ECDC4',
      subCategories: [
        { id: 'gas', name: 'Gas & Fuel', parentId: 'transportation', icon: '⛽', color: '#4ECDC4' },
        { id: 'parking', name: 'Parking', parentId: 'transportation', icon: '🅿️', color: '#7ED7D1' },
        { id: 'public_transport', name: 'Public Transportation', parentId: 'transportation', icon: '🚌', color: '#AEE2DE' },
        { id: 'rideshare', name: 'Rideshare', parentId: 'transportation', icon: '🚕', color: '#DEEDEB' }
      ]
    },
    {
      id: 'shopping',
      name: 'Shopping',
      icon: '🛍️',
      color: '#45B7D1',
      subCategories: [
        { id: 'clothing', name: 'Clothing', parentId: 'shopping', icon: '👕', color: '#45B7D1' },
        { id: 'electronics', name: 'Electronics', parentId: 'shopping', icon: '📱', color: '#6BC5DA' },
        { id: 'home_garden', name: 'Home & Garden', parentId: 'shopping', icon: '🏠', color: '#91D3E3' },
        { id: 'books', name: 'Books', parentId: 'shopping', icon: '📚', color: '#B7E1EC' }
      ]
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      icon: '🎬',
      color: '#96CEB4',
      subCategories: [
        { id: 'movies', name: 'Movies & TV', parentId: 'entertainment', icon: '🎬', color: '#96CEB4' },
        { id: 'music', name: 'Music', parentId: 'entertainment', icon: '🎵', color: '#A8D5C1' },
        { id: 'games', name: 'Games', parentId: 'entertainment', icon: '🎮', color: '#BADCCE' },
        { id: 'sports', name: 'Sports', parentId: 'entertainment', icon: '⚽', color: '#CCE3DB' }
      ]
    },
    {
      id: 'bills',
      name: 'Bills & Utilities',
      icon: '📄',
      color: '#FECA57',
      subCategories: [
        { id: 'utilities', name: 'Utilities', parentId: 'bills', icon: '💡', color: '#FECA57' },
        { id: 'phone', name: 'Phone', parentId: 'bills', icon: '📱', color: '#FED670' },
        { id: 'internet', name: 'Internet', parentId: 'bills', icon: '🌐', color: '#FEE189' },
        { id: 'insurance', name: 'Insurance', parentId: 'bills', icon: '🛡️', color: '#FEECA2' }
      ]
    }
  ];

  // Common merchants database (similar to Mint's merchant recognition)
  private merchantDatabase: MerchantData[] = [
    {
      id: 'amazon',
      name: 'Amazon',
      aliases: ['amazon.in', 'amazon.com', 'amzn', 'amazon pay'],
      defaultCategory: 'shopping'
    },
    {
      id: 'swiggy',
      name: 'Swiggy',
      aliases: ['swiggy', 'swiggy.com'],
      defaultCategory: 'restaurants'
    },
    {
      id: 'zomato',
      name: 'Zomato',
      aliases: ['zomato', 'zomato.com'],
      defaultCategory: 'restaurants'
    },
    {
      id: 'uber',
      name: 'Uber',
      aliases: ['uber', 'uber india'],
      defaultCategory: 'rideshare'
    },
    {
      id: 'ola',
      name: 'Ola',
      aliases: ['ola', 'ola cabs'],
      defaultCategory: 'rideshare'
    },
    {
      id: 'netflix',
      name: 'Netflix',
      aliases: ['netflix', 'netflix.com'],
      defaultCategory: 'movies'
    },
    {
      id: 'spotify',
      name: 'Spotify',
      aliases: ['spotify', 'spotify premium'],
      defaultCategory: 'music'
    }
  ];

  static getInstance(): MintLikeFeatures {
    if (!MintLikeFeatures.instance) {
      MintLikeFeatures.instance = new MintLikeFeatures();
    }
    return MintLikeFeatures.instance;
  }

  // Auto-categorize transactions based on merchant recognition
  autoCategorizeTrasaction(transaction: Transaction): string {
    const description = transaction.description.toLowerCase();
    
    // Try to match with known merchants
    for (const merchant of this.merchantDatabase) {
      for (const alias of merchant.aliases) {
        if (description.includes(alias.toLowerCase())) {
          console.log(`🏪 Merchant detected: ${merchant.name} → ${merchant.defaultCategory}`);
          return merchant.defaultCategory;
        }
      }
    }

    // Fallback to keyword-based categorization
    return this.keywordBasedCategorization(description);
  }

  private keywordBasedCategorization(description: string): string {
    const categoryKeywords = {
      'restaurants': ['restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger', 'kitchen'],
      'groceries': ['grocery', 'supermarket', 'market', 'store', 'mart', 'fresh', 'organic'],
      'gas': ['petrol', 'fuel', 'gas', 'station', 'pump', 'bharat petroleum', 'indian oil'],
      'utilities': ['electricity', 'water', 'gas bill', 'utility', 'power', 'electric'],
      'phone': ['mobile', 'phone', 'telecom', 'airtel', 'jio', 'vodafone', 'recharge'],
      'internet': ['internet', 'broadband', 'wifi', 'data', 'fiber'],
      'movies': ['cinema', 'movie', 'theater', 'pvr', 'inox', 'multiplex'],
      'clothing': ['clothing', 'fashion', 'apparel', 'shirt', 'dress', 'shoes'],
      'medical': ['hospital', 'doctor', 'medical', 'pharmacy', 'medicine', 'clinic']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  // Generate spending insights similar to Mint
  generateSpendingInsights(
    transactions: Transaction[], 
    budget: MonthlyBudget,
    previousMonthTransactions: Transaction[]
  ): SpendingInsight[] {
    const insights: SpendingInsight[] = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Current month spending by category
    const currentSpending = this.calculateCategorySpending(transactions, currentMonth, currentYear);
    const previousSpending = this.calculateCategorySpending(previousMonthTransactions, currentMonth - 1, currentYear);

    // Generate trend insights
    for (const [category, amount] of Object.entries(currentSpending)) {
      const previousAmount = previousSpending[category] || 0;
      const change = amount - previousAmount;
      const changePercent = previousAmount > 0 ? (change / previousAmount) * 100 : 0;

      if (Math.abs(changePercent) > 20) {
        insights.push({
          id: `trend_${category}`,
          type: 'trend',
          title: `${category} spending ${change > 0 ? 'increased' : 'decreased'}`,
          description: `You spent ₹${amount.toLocaleString()} on ${category} this month, ${Math.abs(changePercent).toFixed(1)}% ${change > 0 ? 'more' : 'less'} than last month.`,
          category,
          amount: change,
          percentage: changePercent,
          timeframe: 'month',
          severity: Math.abs(changePercent) > 50 ? 'high' : 'medium',
          actionable: true,
          action: {
            type: 'category_review',
            label: 'Review Category',
            data: { category, currentAmount: amount, previousAmount }
          }
        });
      }
    }

    // Generate budget alerts
    const budgetAlerts = this.generateBudgetAlerts(currentSpending, budget);
    insights.push(...budgetAlerts.map(alert => ({
      id: `budget_${alert.category}`,
      type: 'alert' as const,
      title: alert.message,
      description: `You've spent ₹${alert.currentSpending.toLocaleString()} of your ₹${alert.budgetLimit.toLocaleString()} budget for ${alert.category}.`,
      category: alert.category,
      amount: alert.currentSpending,
      percentage: alert.percentage,
      timeframe: 'month',
      severity: (alert.alertType === 'exceeded' ? 'high' : alert.alertType === 'approaching' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      actionable: true,
      action: {
        type: 'budget_adjust' as const,
        label: 'Adjust Budget',
        data: alert
      }
    })));

    // Generate achievement insights
    const achievements = this.generateAchievements(transactions, budget);
    insights.push(...achievements);

    return insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private calculateCategorySpending(transactions: Transaction[], month: number, year: number): Record<string, number> {
    const spending: Record<string, number> = {};
    
    transactions
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === month && date.getFullYear() === year && t.type === 'expense';
      })
      .forEach(t => {
        const category = t.category || 'other';
        spending[category] = (spending[category] || 0) + t.amount;
      });

    return spending;
  }

  private generateBudgetAlerts(spending: Record<string, number>, budget: MonthlyBudget): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    
    // Map budget categories to spending categories
    const budgetMapping = {
      'household': budget.expenses.household,
      'insurance': budget.expenses.insurance,
      'loans': budget.expenses.loans,
      'investments': budget.expenses.investments,
      'other': budget.expenses.other
    };

    for (const [category, budgetLimit] of Object.entries(budgetMapping)) {
      const currentSpending = spending[category] || 0;
      const percentage = budgetLimit > 0 ? (currentSpending / budgetLimit) * 100 : 0;

      let alertType: BudgetAlert['alertType'] = 'on_track';
      let message = '';
      let recommendations: string[] = [];

      if (percentage >= 100) {
        alertType = 'exceeded';
        message = `Budget exceeded for ${category}`;
        recommendations = [
          'Review recent transactions in this category',
          'Consider adjusting your budget for next month',
          'Look for ways to reduce spending in this area'
        ];
      } else if (percentage >= 80) {
        alertType = 'approaching';
        message = `Approaching budget limit for ${category}`;
        recommendations = [
          'Monitor spending closely for the rest of the month',
          'Consider postponing non-essential purchases',
          'Review if this category needs a higher budget'
        ];
      } else {
        message = `On track with ${category} budget`;
        recommendations = [
          'Great job staying within budget!',
          'Consider allocating unused budget to savings'
        ];
      }

      alerts.push({
        id: `alert_${category}`,
        category,
        budgetLimit,
        currentSpending,
        percentage,
        alertType,
        message,
        recommendations
      });
    }

    return alerts.filter(alert => alert.alertType !== 'on_track' || alert.percentage > 0);
  }

  private generateAchievements(transactions: Transaction[], _budget: MonthlyBudget): SpendingInsight[] {
    const achievements: SpendingInsight[] = [];
    
    // Check for spending streaks
    const recentTransactions = transactions
      .filter(t => {
        const date = new Date(t.date);
        const now = new Date();
        const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Check for no spending days
    const uniqueDays = new Set(recentTransactions.map(t => t.date.split('T')[0]));
    const totalDays = 30;
    const noSpendingDays = totalDays - uniqueDays.size;

    if (noSpendingDays >= 5) {
      achievements.push({
        id: 'no_spending_streak',
        type: 'achievement',
        title: 'Great self-control!',
        description: `You had ${noSpendingDays} days with no spending this month. Keep it up!`,
        timeframe: 'month',
        severity: 'low',
        actionable: false
      });
    }

    return achievements;
  }

  // Get category hierarchy
  getCategoryHierarchy(): CategoryHierarchy[] {
    return this.defaultCategories;
  }

  // Find merchant by transaction description
  findMerchant(description: string): MerchantData | null {
    const lowerDescription = description.toLowerCase();
    
    for (const merchant of this.merchantDatabase) {
      for (const alias of merchant.aliases) {
        if (lowerDescription.includes(alias.toLowerCase())) {
          return merchant;
        }
      }
    }
    
    return null;
  }

  // Generate monthly spending summary (similar to Mint's monthly summary)
  generateMonthlySpendingSummary(transactions: Transaction[], month: number, year: number) {
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const investments = monthTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = this.calculateCategorySpending(monthTransactions, month, year);
    const topCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      month,
      year,
      income,
      expenses,
      investments,
      netIncome: income - expenses - investments,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      categoryBreakdown,
      topCategories,
      transactionCount: monthTransactions.length,
      averageTransactionAmount: monthTransactions.length > 0 ? 
        monthTransactions.reduce((sum, t) => sum + t.amount, 0) / monthTransactions.length : 0
    };
  }
}

export const mintLikeFeatures = MintLikeFeatures.getInstance();