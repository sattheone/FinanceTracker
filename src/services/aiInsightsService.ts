import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction, Goal, Asset, Insurance, MonthlyBudget } from '../types';
import { UserProfile } from '../types/user';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface AIInsight {
  id: string;
  type: 'financial_health' | 'goal_optimization' | 'investment_advice' | 'tax_planning' | 'risk_assessment' | 'opportunity' | 'warning';
  title: string;
  description: string;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  actionable: boolean;
  actions?: AIAction[];
  impact: {
    financial: number; // Potential financial impact in rupees
    timeframe: 'immediate' | 'short_term' | 'long_term';
    effort: 'low' | 'medium' | 'high';
  };
  data: any; // Supporting data for the insight
  createdAt: string;
  expiresAt?: string; // Some insights may be time-sensitive
}

export interface AIAction {
  id: string;
  label: string;
  type: 'navigate' | 'create' | 'update' | 'alert' | 'external';
  data: any;
  estimated_time: string; // e.g., "5 minutes", "1 hour"
  difficulty: 'easy' | 'moderate' | 'complex';
}

export interface FinancialHealthScore {
  overall: number; // 0-100
  breakdown: {
    emergency_fund: number;
    debt_to_income: number;
    savings_rate: number;
    investment_diversification: number;
    insurance_coverage: number;
    goal_progress: number;
  };
  recommendations: string[];
}

export class AIInsightsService {
  private static instance: AIInsightsService;
  private model: any;
  private hasApiKey: boolean;

  constructor() {
    this.hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
    
    if (this.hasApiKey) {
      try {
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-pro',
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent financial advice
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        });
        console.log('✅ AI Insights service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize AI Insights service:', error);
        this.hasApiKey = false;
      }
    }
  }

  static getInstance(): AIInsightsService {
    if (!AIInsightsService.instance) {
      AIInsightsService.instance = new AIInsightsService();
    }
    return AIInsightsService.instance;
  }

  async generateComprehensiveInsights(
    _transactions: Transaction[],
    goals: Goal[],
    assets: Asset[],
    _insurance: Insurance[],
    budget: MonthlyBudget,
    _userProfile: UserProfile | null
  ): Promise<AIInsight[]> {
    if (!this.hasApiKey) {
      return this.getMockInsights();
    }

    try {
      console.log('🤖 Generating comprehensive AI insights...');
      
      const insights: AIInsight[] = [];
      
      // Generate different types of insights
      const [
        financialHealthInsights,
        goalOptimizationInsights,
        investmentInsights,
        taxPlanningInsights,
        riskAssessmentInsights
      ] = await Promise.all([
        this.analyzeFinancialHealth(_transactions, assets, _insurance, budget, _userProfile),
        this.analyzeGoalOptimization(goals, _transactions, _userProfile),
        this.analyzeInvestmentOpportunities(assets, _transactions, _userProfile),
        this.analyzeTaxPlanning(_transactions, assets, _userProfile),
        this.analyzeRiskAssessment(assets, _insurance, _userProfile)
      ]);

      insights.push(
        ...financialHealthInsights,
        ...goalOptimizationInsights,
        ...investmentInsights,
        ...taxPlanningInsights,
        ...riskAssessmentInsights
      );

      // Sort by priority and confidence
      return insights.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

    } catch (error) {
      console.error('Error generating AI insights:', error);
      return this.getMockInsights();
    }
  }

  private async analyzeFinancialHealth(
    _transactions: Transaction[],
    assets: Asset[],
    _insurance: Insurance[],
    budget: MonthlyBudget,
    _userProfile: UserProfile | null
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    // Calculate financial health metrics
    const monthlyIncome = budget.income;
    const monthlyExpenses = Object.values(budget.expenses).reduce((sum, exp) => sum + exp, 0);
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const emergencyFundMonths = totalAssets / monthlyExpenses;

    // Emergency Fund Analysis
    if (emergencyFundMonths < 3) {
      insights.push({
        id: 'emergency_fund_low',
        type: 'warning',
        title: 'Emergency Fund Below Recommended Level',
        description: `You have ${emergencyFundMonths.toFixed(1)} months of expenses saved. Financial experts recommend 3-6 months of expenses for emergencies.`,
        confidence: 0.95,
        priority: 'high',
        category: 'Emergency Planning',
        actionable: true,
        actions: [
          {
            id: 'create_emergency_goal',
            label: 'Create Emergency Fund Goal',
            type: 'create',
            data: { type: 'goal', category: 'emergency' },
            estimated_time: '5 minutes',
            difficulty: 'easy'
          },
          {
            id: 'automate_savings',
            label: 'Set Up Automatic Savings',
            type: 'navigate',
            data: { page: '/recurring' },
            estimated_time: '10 minutes',
            difficulty: 'easy'
          }
        ],
        impact: {
          financial: (3 * monthlyExpenses) - totalAssets,
          timeframe: 'short_term',
          effort: 'medium'
        },
        data: { currentMonths: emergencyFundMonths, recommendedMonths: 3 },
        createdAt: new Date().toISOString()
      });
    }

    // Savings Rate Analysis
    if (savingsRate < 20) {
      insights.push({
        id: 'low_savings_rate',
        type: 'opportunity',
        title: 'Opportunity to Increase Savings Rate',
        description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Increasing this to 20% could significantly improve your financial future.`,
        confidence: 0.85,
        priority: 'medium',
        category: 'Savings Optimization',
        actionable: true,
        actions: [
          {
            id: 'analyze_expenses',
            label: 'Analyze Expense Categories',
            type: 'navigate',
            data: { page: '/categories' },
            estimated_time: '15 minutes',
            difficulty: 'easy'
          }
        ],
        impact: {
          financial: (0.20 - savingsRate/100) * monthlyIncome * 12,
          timeframe: 'long_term',
          effort: 'medium'
        },
        data: { currentRate: savingsRate, targetRate: 20 },
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  private async analyzeGoalOptimization(
    goals: Goal[],
    _transactions: Transaction[],
    _userProfile: UserProfile | null
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    for (const goal of goals) {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const timeToGoal = new Date(goal.targetDate).getTime() - new Date().getTime();
      const monthsToGoal = timeToGoal / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsToGoal > 0) {
        const requiredMonthlySaving = (goal.targetAmount - goal.currentAmount) / monthsToGoal;
        const currentMonthlySaving = goal.monthlyContribution;
        
        if (currentMonthlySaving < requiredMonthlySaving * 0.9) {
          insights.push({
            id: `goal_behind_${goal.id}`,
            type: 'warning',
            title: `${goal.name} Goal Behind Schedule`,
            description: `You need to save ₹${requiredMonthlySaving.toLocaleString()}/month to reach your ${goal.name} goal, but you're currently saving ₹${currentMonthlySaving.toLocaleString()}/month.`,
            confidence: 0.90,
            priority: 'medium',
            category: 'Goal Planning',
            actionable: true,
            actions: [
              {
                id: 'increase_contribution',
                label: 'Increase Monthly Contribution',
                type: 'update',
                data: { goalId: goal.id, suggestedAmount: requiredMonthlySaving },
                estimated_time: '2 minutes',
                difficulty: 'easy'
              },
              {
                id: 'extend_timeline',
                label: 'Extend Goal Timeline',
                type: 'update',
                data: { goalId: goal.id, type: 'timeline' },
                estimated_time: '2 minutes',
                difficulty: 'easy'
              }
            ],
            impact: {
              financial: goal.targetAmount - goal.currentAmount,
              timeframe: 'long_term',
              effort: 'low'
            },
            data: { 
              goalId: goal.id,
              currentProgress: progress,
              requiredMonthlySaving,
              currentMonthlySaving,
              shortfall: requiredMonthlySaving - currentMonthlySaving
            },
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    return insights;
  }

  private async analyzeInvestmentOpportunities(
    assets: Asset[],
    _transactions: Transaction[],
    _userProfile: UserProfile | null
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    const totalInvestments = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const stocksValue = assets.filter(a => a.category === 'stocks').reduce((sum, a) => sum + a.currentValue, 0);
    // const mfValue = assets.filter(a => a.category === 'mutual_funds').reduce((sum, a) => sum + a.currentValue, 0);
    const fdValue = assets.filter(a => a.category === 'fixed_deposit').reduce((sum, a) => sum + a.currentValue, 0);
    
    // Diversification Analysis
    if (totalInvestments > 0) {
      const stocksPercent = (stocksValue / totalInvestments) * 100;
      const fdPercent = (fdValue / totalInvestments) * 100;
      
      if (stocksPercent > 70) {
        insights.push({
          id: 'high_equity_concentration',
          type: 'risk_assessment',
          title: 'High Equity Concentration Risk',
          description: `${stocksPercent.toFixed(1)}% of your portfolio is in stocks. Consider diversifying to reduce risk.`,
          confidence: 0.80,
          priority: 'medium',
          category: 'Portfolio Diversification',
          actionable: true,
          actions: [
            {
              id: 'add_debt_funds',
              label: 'Add Debt Mutual Funds',
              type: 'navigate',
              data: { page: '/assets', action: 'add', category: 'mutual_funds' },
              estimated_time: '10 minutes',
              difficulty: 'moderate'
            }
          ],
          impact: {
            financial: 0, // Risk reduction, not direct financial gain
            timeframe: 'long_term',
            effort: 'medium'
          },
          data: { stocksPercent, recommendedMax: 70 },
          createdAt: new Date().toISOString()
        });
      }
      
      if (fdPercent > 40) {
        insights.push({
          id: 'high_fd_allocation',
          type: 'opportunity',
          title: 'Consider Higher Return Investments',
          description: `${fdPercent.toFixed(1)}% of your portfolio is in Fixed Deposits. You might benefit from higher-return investments for long-term goals.`,
          confidence: 0.75,
          priority: 'low',
          category: 'Investment Optimization',
          actionable: true,
          actions: [
            {
              id: 'explore_mutual_funds',
              label: 'Explore Mutual Funds',
              type: 'navigate',
              data: { page: '/assets', action: 'add', category: 'mutual_funds' },
              estimated_time: '20 minutes',
              difficulty: 'moderate'
            }
          ],
          impact: {
            financial: fdValue * 0.05, // Potential additional 5% returns
            timeframe: 'long_term',
            effort: 'medium'
          },
          data: { fdPercent, potentialAdditionalReturn: 5 },
          createdAt: new Date().toISOString()
        });
      }
    }

    return insights;
  }

  private async analyzeTaxPlanning(
    _transactions: Transaction[],
    _assets: Asset[],
    _userProfile: UserProfile | null
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    // Calculate annual investment for 80C
    const currentYear = new Date().getFullYear();
    const investmentTransactions = _transactions.filter((t: Transaction) => 
      t.type === 'investment' && 
      new Date(t.date).getFullYear() === currentYear
    );
    
    const annual80CInvestments = investmentTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const maxDeduction = 150000; // 80C limit
    
    if (annual80CInvestments < maxDeduction) {
      const remainingDeduction = maxDeduction - annual80CInvestments;
      const potentialTaxSaving = remainingDeduction * 0.30; // Assuming 30% tax bracket
      
      insights.push({
        id: 'tax_saving_opportunity',
        type: 'opportunity',
        title: 'Tax Saving Opportunity Under 80C',
        description: `You can save up to ₹${potentialTaxSaving.toLocaleString()} in taxes by investing ₹${remainingDeduction.toLocaleString()} more in 80C instruments this year.`,
        confidence: 0.85,
        priority: 'high',
        category: 'Tax Planning',
        actionable: true,
        actions: [
          {
            id: 'invest_elss',
            label: 'Invest in ELSS Mutual Funds',
            type: 'navigate',
            data: { page: '/assets', action: 'add', category: 'mutual_funds', subcategory: 'elss' },
            estimated_time: '15 minutes',
            difficulty: 'moderate'
          },
          {
            id: 'increase_ppf',
            label: 'Increase PPF Contribution',
            type: 'external',
            data: { url: 'https://www.ppf.gov.in' },
            estimated_time: '30 minutes',
            difficulty: 'moderate'
          }
        ],
        impact: {
          financial: potentialTaxSaving,
          timeframe: 'immediate',
          effort: 'low'
        },
        data: { 
          currentInvestment: annual80CInvestments,
          maxDeduction,
          remainingDeduction,
          potentialTaxSaving
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(currentYear, 2, 31).toISOString() // March 31st
      });
    }

    return insights;
  }

  private async analyzeRiskAssessment(
    assets: Asset[],
    insurance: Insurance[],
    _userProfile: UserProfile | null
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalInsuranceCover = insurance.reduce((sum, ins) => sum + ins.coverAmount, 0);
    
    // Life Insurance Coverage Analysis
    const recommendedCover = totalAssets * 10; // 10x of current assets as a rough estimate
    
    if (totalInsuranceCover < recommendedCover) {
      insights.push({
        id: 'insufficient_life_cover',
        type: 'risk_assessment',
        title: 'Life Insurance Coverage May Be Insufficient',
        description: `Your current life insurance cover is ₹${totalInsuranceCover.toLocaleString()}. Consider increasing it to protect your family's financial future.`,
        confidence: 0.70,
        priority: 'medium',
        category: 'Risk Management',
        actionable: true,
        actions: [
          {
            id: 'add_term_insurance',
            label: 'Add Term Life Insurance',
            type: 'navigate',
            data: { page: '/insurance', action: 'add', type: 'term' },
            estimated_time: '20 minutes',
            difficulty: 'moderate'
          }
        ],
        impact: {
          financial: recommendedCover - totalInsuranceCover,
          timeframe: 'long_term',
          effort: 'medium'
        },
        data: { 
          currentCover: totalInsuranceCover,
          recommendedCover,
          gap: recommendedCover - totalInsuranceCover
        },
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  async generatePersonalizedAdvice(
    userQuery: string,
    context: {
      _transactions: Transaction[];
      goals: Goal[];
      assets: Asset[];
      insurance: Insurance[];
      budget: MonthlyBudget;
      _userProfile: UserProfile | null;
    }
  ): Promise<string> {
    if (!this.hasApiKey) {
      return "I'd love to provide personalized advice, but I need a Gemini API key to analyze your financial data. You can get one free from Google AI Studio.";
    }

    try {
      const prompt = `
        You are a professional financial advisor analyzing a user's complete financial profile. 
        
        User Question: "${userQuery}"
        
        Financial Context:
        - Monthly Income: ₹${context.budget.income.toLocaleString()}
        - Monthly Expenses: ₹${Object.values(context.budget.expenses).reduce((sum, exp) => sum + exp, 0).toLocaleString()}
        - Total Assets: ₹${context.assets.reduce((sum, asset) => sum + asset.currentValue, 0).toLocaleString()}
        - Active Goals: ${context.goals.length} (${context.goals.map(g => g.name).join(', ')})
        - Insurance Policies: ${context.insurance.length}
        - Recent Transactions: ${context._transactions.slice(0, 10).map((t: Transaction) => `${t.description}: ₹${t.amount}`).join(', ')}
        
        Provide specific, actionable financial advice based on this data. Be concise but comprehensive.
        Focus on practical steps they can take immediately.
        Consider Indian financial context (tax laws, investment options, etc.).
        
        Response should be 2-3 paragraphs maximum.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating personalized advice:', error);
      return "I'm having trouble analyzing your data right now. Please try again in a moment.";
    }
  }

  private getMockInsights(): AIInsight[] {
    return [
      {
        id: 'mock_emergency_fund',
        type: 'warning',
        title: 'Build Your Emergency Fund',
        description: 'Having 3-6 months of expenses saved can protect you from unexpected financial challenges.',
        confidence: 0.95,
        priority: 'high',
        category: 'Emergency Planning',
        actionable: true,
        actions: [
          {
            id: 'create_emergency_goal',
            label: 'Create Emergency Fund Goal',
            type: 'create',
            data: { type: 'goal', category: 'emergency' },
            estimated_time: '5 minutes',
            difficulty: 'easy'
          }
        ],
        impact: {
          financial: 150000,
          timeframe: 'short_term',
          effort: 'medium'
        },
        data: {},
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock_tax_saving',
        type: 'opportunity',
        title: 'Tax Saving Opportunity',
        description: 'You can save taxes by investing in 80C instruments like ELSS mutual funds or PPF.',
        confidence: 0.80,
        priority: 'medium',
        category: 'Tax Planning',
        actionable: true,
        actions: [
          {
            id: 'invest_elss',
            label: 'Explore ELSS Funds',
            type: 'navigate',
            data: { page: '/assets' },
            estimated_time: '15 minutes',
            difficulty: 'moderate'
          }
        ],
        impact: {
          financial: 45000,
          timeframe: 'immediate',
          effort: 'low'
        },
        data: {},
        createdAt: new Date().toISOString()
      }
    ];
  }

  calculateFinancialHealthScore(
    _transactions: Transaction[],
    assets: Asset[],
    insurance: Insurance[],
    budget: MonthlyBudget,
    goals: Goal[]
  ): FinancialHealthScore {
    const monthlyIncome = budget.income;
    const monthlyExpenses = Object.values(budget.expenses).reduce((sum, exp) => sum + exp, 0);
    const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalInsuranceCover = insurance.reduce((sum, ins) => sum + ins.coverAmount, 0);
    
    // Calculate individual scores (0-100)
    const emergencyFundScore = Math.min((totalAssets / (monthlyExpenses * 3)) * 100, 100);
    const savingsRateScore = monthlyIncome > 0 ? Math.min(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 500, 100) : 0;
    const insuranceCoverageScore = Math.min((totalInsuranceCover / (monthlyIncome * 120)) * 100, 100); // 10 years coverage
    
    // Investment diversification score
    const stocksValue = assets.filter(a => a.category === 'stocks').reduce((sum, a) => sum + a.currentValue, 0);
    const mfValue = assets.filter(a => a.category === 'mutual_funds').reduce((sum, a) => sum + a.currentValue, 0);
    const diversificationScore = totalAssets > 0 ? 
      100 - Math.abs(50 - (stocksValue + mfValue) / totalAssets * 100) : 0;
    
    // Goal progress score
    const goalProgressScore = goals.length > 0 ? 
      goals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount) * 100, 0) / goals.length : 50;
    
    // Debt to income (assuming no debt data, using expense ratio as proxy)
    const debtToIncomeScore = monthlyIncome > 0 ? 
      Math.max(100 - (monthlyExpenses / monthlyIncome) * 200, 0) : 0;
    
    const breakdown = {
      emergency_fund: Math.round(emergencyFundScore),
      debt_to_income: Math.round(debtToIncomeScore),
      savings_rate: Math.round(savingsRateScore),
      investment_diversification: Math.round(diversificationScore),
      insurance_coverage: Math.round(insuranceCoverageScore),
      goal_progress: Math.round(goalProgressScore)
    };
    
    const overall = Math.round(
      (breakdown.emergency_fund + 
       breakdown.debt_to_income + 
       breakdown.savings_rate + 
       breakdown.investment_diversification + 
       breakdown.insurance_coverage + 
       breakdown.goal_progress) / 6
    );
    
    const recommendations = [];
    if (breakdown.emergency_fund < 70) recommendations.push("Build a stronger emergency fund");
    if (breakdown.savings_rate < 60) recommendations.push("Increase your savings rate");
    if (breakdown.insurance_coverage < 70) recommendations.push("Review your insurance coverage");
    if (breakdown.investment_diversification < 60) recommendations.push("Diversify your investment portfolio");
    if (breakdown.goal_progress < 50) recommendations.push("Accelerate progress towards your financial goals");
    
    return {
      overall,
      breakdown,
      recommendations
    };
  }
}

export const aiInsightsService = AIInsightsService.getInstance();